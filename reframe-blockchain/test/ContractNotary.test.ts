import { expect } from "chai";
import hre from "hardhat";

// Default import: the Hardhat config loads the shared .env with import.meta, so files run as ES modules.
const { ethers } = hre;

const sha = (s: string) => ethers.sha256(ethers.toUtf8Bytes(s)); // SHA-256 -> bytes32

async function setup() {
  const [admin, studio, client, other] = await ethers.getSigners();
  const c = await ethers.deployContract("ContractNotary", [admin.address]);
  await c.grantRole(await c.STUDIO_ROLE(), studio.address);
  return { c, admin, studio, client, other };
}

describe("ContractNotary", () => {
  it("enregistre une empreinte et la retrouve", async () => {
    const { c, studio, client } = await setup();
    const h = sha("contrat v1");
    await expect(c.connect(studio).register(h, "DEV-2026-0001", client.address))
      .to.emit(c, "ContractRegistered").withArgs(h, "DEV-2026-0001", studio.address, client.address);
    const r = await c.verify(h);
    expect(r.status).to.equal(1n); // Active
    expect(r.reference).to.equal("DEV-2026-0001");
  });

  it("une empreinte inconnue (PDF modifié) n'est pas trouvée", async () => {
    const { c, studio, client } = await setup();
    await c.connect(studio).register(sha("contrat v1"), "DEV-2026-0001", client.address);
    expect((await c.verify(sha("contrat v1 modifié"))).status).to.equal(0n); // None
  });

  it("refuse l'enregistrement par un compte non autorisé et les doublons", async () => {
    const { c, studio, client, other } = await setup();
    const h = sha("x");
    await expect(c.connect(other).register(h, "DEV-1", client.address)).to.be.reverted;
    await c.connect(studio).register(h, "DEV-1", client.address);
    await expect(c.connect(studio).register(h, "DEV-1", client.address)).to.be.revertedWithCustomError(c, "AlreadyRegistered");
    await expect(c.connect(studio).register(ethers.ZeroHash, "DEV-2", client.address)).to.be.revertedWithCustomError(c, "EmptyHash");
  });

  it("co-signature : seul le client désigné, une seule fois", async () => {
    const { c, studio, client, other } = await setup();
    const h = sha("x");
    await c.connect(studio).register(h, "DEV-1", client.address);
    await expect(c.connect(other).clientSign(h)).to.be.revertedWithCustomError(c, "NotTheClient");
    await expect(c.connect(client).clientSign(h)).to.emit(c, "ContractSigned").withArgs(h, client.address);
    expect((await c.verify(h)).clientSignedAt).to.be.gt(0n);
    await expect(c.connect(client).clientSign(h)).to.be.revertedWithCustomError(c, "AlreadySigned");
  });

  it("pas de co-signature si aucun wallet client n'a été fourni", async () => {
    const { c, studio, other } = await setup();
    const h = sha("x");
    await c.connect(studio).register(h, "DEV-1", ethers.ZeroAddress);
    await expect(c.connect(other).clientSign(h)).to.be.revertedWithCustomError(c, "NotTheClient");
  });

  it("avenant : l'ancienne version est remplacée, l'historique est conservé", async () => {
    const { c, studio, client } = await setup();
    const v1 = sha("v1"), v2 = sha("v2");
    await c.connect(studio).register(v1, "DEV-1", client.address);
    await expect(c.connect(studio).amend(v1, v2, "DEV-AUTRE", client.address)).to.be.revertedWithCustomError(c, "ReferenceMismatch");
    await expect(c.connect(studio).amend(v1, v2, "DEV-1", client.address)).to.emit(c, "ContractAmended").withArgs(v1, v2);
    const old = await c.verify(v1);
    expect(old.status).to.equal(3n); // Superseded
    expect(old.supersededBy).to.equal(v2);
    expect(await c.versionsOf("DEV-1")).to.deep.equal([v1, v2]);
  });

  it("révocation", async () => {
    const { c, studio, client } = await setup();
    const h = sha("x");
    await c.connect(studio).register(h, "DEV-1", client.address);
    await expect(c.connect(studio).revoke(h, "annulé")).to.emit(c, "ContractRevoked");
    expect((await c.verify(h)).status).to.equal(2n); // Revoked
    await expect(c.connect(client).clientSign(h)).to.be.revertedWithCustomError(c, "NotActive");
  });
});
