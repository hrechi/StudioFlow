import hre from "hardhat";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Deploys EquipmentAllocation on the shared Ganache and writes the app's contract file
 * (src/modules/allocation/contract/EquipmentAllocation.json: address, chainId, abi), which is
 * what the original StudioFlow-Blockchain `npm run deploy && npm run export` did.
 *
 * The deployer becomes the contract OWNER (the studio admin). It is Ganache account (0) — the
 * admin's MetaMask wallet in the shared setup — signed by Ganache itself (its accounts are
 * unlocked), so no private key is needed here. Override with ALLOCATION_OWNER_INDEX.
 */
async function main() {
  const { ethers } = hre;
  const url = "http://127.0.0.1:7545";
  const provider = new ethers.JsonRpcProvider(url, 1337, { staticNetwork: true, cacheTimeout: -1 });
  const index = Number(process.env.ALLOCATION_OWNER_INDEX ?? 0);
  const owner = await provider.getSigner(index);
  console.log(`Deploying EquipmentAllocation from Ganache account (${index}): ${owner.address}`);

  const factory = await ethers.getContractFactory("EquipmentAllocation", owner);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`EquipmentAllocation deployed: ${address}`);

  const artifact = await hre.artifacts.readArtifact("EquipmentAllocation");
  const target = fileURLToPath(
    new URL("../../src/modules/allocation/contract/EquipmentAllocation.json", import.meta.url),
  );
  writeFileSync(target, `${JSON.stringify({ address, chainId: 1337, abi: artifact.abi }, null, 2)}\n`);
  console.log(`App contract file updated: ${target}`);
  console.log("Restart the app (or rebuild the Docker image) so it uses the new address.");
}

main().catch((e: unknown) => {
  console.error("\n❌ Deploy failed:", e);
  process.exitCode = 1;
});
