import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Phase 3: sealing is verified from the chain, never trusted from the browser. */

const m = vi.hoisted(() => ({
  galerie: vi.fn(),
  wallet: vi.fn(),
  receipt: vi.fn(),
  photos: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/modules/photos-galeries/galerie.service", () => ({ getGalerieById: m.galerie }));
vi.mock("@/modules/utilisateurs/utilisateur.service", () => ({ getUtilisateurWallet: m.wallet }));
vi.mock("../snapseal.server-chain", () => ({ readSealReceipt: m.receipt }));
vi.mock("../snapseal.model", () => ({ GalerieSeal: { exists: m.exists, create: m.create } }));

// Two photos whose "files" are known bytes, so their real SHA-256 is computed by the service.
const FILES: Record<string, string> = { a: "photo A bytes", b: "photo B bytes" };
const ids = { a: new Types.ObjectId().toString(), b: new Types.ObjectId().toString() };
const sha = (text: string) => `0x${createHash("sha256").update(text).digest("hex")}`;
vi.mock("@/modules/photos-galeries/photo.service", () => ({
  toObjectId: (id: string) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null),
  listPhotosOfGalerie: m.photos,
  getPhotoFileAccess: async (photoId: string) => {
    const key = photoId === ids.a ? "a" : "b";
    return {
      open: async () => ({
        stream: new Blob([FILES[key]]).stream(),
        contentType: "image/jpeg",
        length: FILES[key].length,
      }),
    };
  },
}));

const { verifyAndRecordSeal } = await import("../snapseal.service");

const config = {
  registryAddress: "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab",
  deliveryAddress: "0x5b1869D9A4C187F2EAa108f3062412ecf0526b24",
  chainId: 1337,
  networkName: "Ganache",
  rpcUrl: "http://127.0.0.1:7545",
  explorerUrl: null,
};
const CLIENT = "0xffcf8fdee72ac11b5c542428b35eef5769c409f0";
const TX = `0x${"ab".repeat(32)}`;
const G = new Types.ObjectId().toString();

describe("verifyAndRecordSeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.galerie.mockResolvedValue({ id: G, preuveBlockchainRequise: true, client: { id: "c1" } });
    m.wallet.mockResolvedValue(CLIENT);
    m.photos.mockResolvedValue([
      { id: ids.a, nomFichier: "a.jpg", statutCulling: "RETENUE" },
      { id: ids.b, nomFichier: "b.jpg", statutCulling: "EN_ATTENTE" },
    ]);
    m.exists.mockResolvedValue(null);
    m.receipt.mockResolvedValue({
      onChainId: 4,
      photographer: "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1",
      client: CLIENT,
      hashes: [sha(FILES.b), sha(FILES.a)], // order doesn't matter
    });
  });

  it("records a genuine seal with the id read from the chain", async () => {
    await verifyAndRecordSeal(config, G, TX);
    expect(m.create).toHaveBeenCalledOnce();
    expect(m.create.mock.calls[0][0]).toMatchObject({ onChainId: 4, txHash: TX, clientWallet: CLIENT });
  });

  it("refuses a seal made for another wallet than the client's linked one", async () => {
    m.wallet.mockResolvedValue("0x22d491bde2303f2f43325b2108d26f1eaba1e32b");
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/another wallet/);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses when the client has no linked wallet", async () => {
    m.wallet.mockResolvedValue(null);
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/another wallet/);
  });

  it("refuses altered fingerprints", async () => {
    m.receipt.mockResolvedValue({
      onChainId: 4,
      photographer: "0x90f8",
      client: CLIENT,
      hashes: [sha(FILES.a), sha("something else")],
    });
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/don't match/);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses an unknown transaction or one from another contract (the reader rejects it)", async () => {
    const { ServiceError } = await import("@/lib/action-result");
    m.receipt.mockRejectedValue(new ServiceError("This transaction was not found on the blockchain."));
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/not found/);
    m.receipt.mockRejectedValue(
      new ServiceError("This transaction did not create a gallery in the SnapSeal contract."),
    );
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/SnapSeal contract/);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses an on-chain gallery already linked to another gallery", async () => {
    m.exists.mockResolvedValue({ _id: "other" });
    await expect(verifyAndRecordSeal(config, G, TX)).rejects.toThrow(/already linked/);
  });

  it("doesn't require a linked wallet on a gallery without the option", async () => {
    m.galerie.mockResolvedValue({ id: G, preuveBlockchainRequise: false, client: { id: "c1" } });
    m.wallet.mockResolvedValue(null);
    await verifyAndRecordSeal(config, G, TX);
    expect(m.create).toHaveBeenCalledOnce();
  });
});
