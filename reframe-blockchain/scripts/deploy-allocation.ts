import hre from "hardhat";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Deploys EquipmentAllocation and writes the app's contract file
 * (src/modules/allocation/contract/EquipmentAllocation.json: address, chainId, abi).
 * The deployer becomes the contract OWNER: the studio admin's MetaMask wallet.
 *
 * - Ganache (npm run deploy:allocation): Ganache account (0), unlocked, no key needed
 *   (override with ALLOCATION_OWNER_INDEX).
 * - Sepolia (npm run deploy:allocation:sepolia): the admin wallet's key, SEPOLIA_PRIVATE_KEY.
 *   The JSON is left alone (it stays the Ganache one for local work): the deployed site gets
 *   the address from ALLOCATION_CONTRACT_ADDRESS (printed below), the ABI being the same.
 */
async function main() {
  const { ethers } = hre;
  const sepolia = hre.network.name === "sepolia";
  let owner;
  let chainId: number;
  if (sepolia) {
    const key = process.env.SEPOLIA_PRIVATE_KEY?.trim();
    if (!key) throw new Error("Set SEPOLIA_PRIVATE_KEY (the admin wallet's key) in the StudioFlow .env");
    const url = (hre.network.config as { url: string }).url;
    const provider = new ethers.JsonRpcProvider(url, 11155111, { staticNetwork: true });
    owner = new ethers.Wallet(key, provider);
    chainId = 11155111;
    const balance = await provider.getBalance(owner.address);
    console.log(`Admin wallet ${owner.address}: ${ethers.formatEther(balance)} Sepolia ETH`);
    if (balance === 0n) throw new Error("This wallet has no Sepolia ETH: get some from a faucet first.");
  } else {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545", 1337, {
      staticNetwork: true,
      cacheTimeout: -1,
    });
    const index = Number(process.env.ALLOCATION_OWNER_INDEX ?? 0);
    owner = await provider.getSigner(index);
    chainId = 1337;
    console.log(`Deploying EquipmentAllocation from Ganache account (${index}): ${owner.address}`);
  }

  const factory = await ethers.getContractFactory("EquipmentAllocation", owner);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`EquipmentAllocation deployed: ${address}`);

  if (sepolia) {
    console.log("
Add these to Vercel (Settings → Environment Variables), then redeploy:");
    console.log(`ALLOCATION_CONTRACT_ADDRESS=${address}`);
    console.log(`NEXT_PUBLIC_CHAIN_ID=${chainId}`);
    return;
  }

  const artifact = await hre.artifacts.readArtifact("EquipmentAllocation");
  const target = fileURLToPath(
    new URL("../../src/modules/allocation/contract/EquipmentAllocation.json", import.meta.url),
  );
  writeFileSync(target, `${JSON.stringify({ address, chainId, abi: artifact.abi }, null, 2)}\n`);
  console.log(`App contract file updated: ${target}`);
  console.log("Restart the app (or rebuild the Docker image) so it uses the new address.");
}

main().catch((e: unknown) => {
  console.error("\n❌ Deploy failed:", e);
  process.exitCode = 1;
});
