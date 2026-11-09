import hre from "hardhat";

/**
 * Deploys ContractNotary (contracts module). The signer is the server's account
 * (STUDIO_PRIVATE_KEY on Ganache, SEPOLIA_STUDIO_PRIVATE_KEY on Sepolia): it gets the STUDIO role and pays for every contract registered from the app.
 * Usage: npm run deploy:ganache  or  npm run deploy:sepolia
 */
async function main() {
  const { ethers } = hre;
  const [studio] = await ethers.getSigners();
  if (!studio) {
    throw new Error(
      hre.network.name === "sepolia"
        ? "No signer: set SEPOLIA_STUDIO_PRIVATE_KEY in the StudioFlow .env"
        : "No signer: set STUDIO_PRIVATE_KEY in the StudioFlow .env",
    );
  }
  console.log(`Network: ${hre.network.name}`);
  console.log("Deploying from account:", studio.address);

  const balance = await ethers.provider.getBalance(studio.address);
  console.log("Account balance (ETH) :", ethers.formatEther(balance));
  if (balance === 0n) {
    throw new Error(
      hre.network.name === "sepolia"
        ? "This account has no Sepolia ETH: get some from a faucet first (see DEPLOYMENT.md)."
        : "Account has no ETH. Make sure Ganache is running and the private key is correct.",
    );
  }

  const Notary = await ethers.getContractFactory("ContractNotary");
  const notary = await Notary.deploy(studio.address);
  await notary.waitForDeployment();
  const address = await notary.getAddress();

  const rpc = hre.network.name === "sepolia" ? (hre.network.config as { url: string }).url : "http://127.0.0.1:7545";
  console.log("\n✅ ContractNotary deployed:", address);
  console.log("\nSettings for the app (.env locally, Environment Variables on Vercel):");
  console.log(`BLOCKCHAIN_RPC_URL=${rpc}`);
  console.log("STUDIO_PRIVATE_KEY=<the same key you deployed with>");
  console.log(`NOTARY_ADDRESS=${address}`);
}

main().catch((e: unknown) => {
  console.error("\n❌ Deploy failed:", e);
  process.exitCode = 1;
});
