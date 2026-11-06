// eslint-disable-next-line @typescript-eslint/no-require-imports
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signer found. Make sure STUDIO_PRIVATE_KEY is set in .env " +
      "(files/reframe-blockchain/.env) and Ganache is running on http://127.0.0.1:7545"
    );
  }

  const studio = signers[0];
  console.log("Deploying from account:", studio.address);

  const balance = await ethers.provider.getBalance(studio.address);
  console.log("Account balance (ETH) :", ethers.formatEther(balance));

  if (balance === 0n) {
    throw new Error("Account has no ETH. Make sure Ganache is running and the private key is correct.");
  }

  const Notary = await ethers.getContractFactory("ContractNotary");
  const notary = await Notary.deploy(studio.address);
  await notary.waitForDeployment();

  const address = await notary.getAddress();
  console.log("\n✅ ContractNotary deployed:", address);
  console.log("\nAdd these lines to your StudioFlow .env.local:");
  console.log(`BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545`);
  console.log(`STUDIO_PRIVATE_KEY=${process.env.STUDIO_PRIVATE_KEY}`);
  console.log(`NOTARY_ADDRESS=${address}`);
}

main().catch((e: unknown) => { console.error("\n❌ Deploy failed:", e); process.exitCode = 1; });
