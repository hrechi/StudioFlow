/**
 * Deploys SelectionRegistry, then DeliveryReceipt with its address, and prints the app settings.
 * Usage: npm run deploy:ganache  or  npm run deploy:sepolia
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account: set SEPOLIA_PRIVATE_KEY in contracts/.env");
  }
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address} (${hre.ethers.formatEther(balance)} ETH)`);
  if (balance === 0n) throw new Error("The deployer account has no ETH to pay for the deployment.");

  const registry = await hre.ethers.deployContract("SelectionRegistry");
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`SelectionRegistry deployed: ${registryAddress}`);

  const delivery = await hre.ethers.deployContract("DeliveryReceipt", [registryAddress]);
  await delivery.waitForDeployment();
  const deliveryAddress = await delivery.getAddress();
  console.log(`DeliveryReceipt deployed:   ${deliveryAddress}`);

  console.log(
    "\nAdd these lines to .env.local (in the StudioFlow folder), then restart the app:\n",
  );
  console.log(`SNAPSEAL_NETWORK=${hre.network.name}`);
  console.log(`SNAPSEAL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`SNAPSEAL_DELIVERY_ADDRESS=${deliveryAddress}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
