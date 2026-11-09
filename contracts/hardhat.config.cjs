require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");

const path = require("node:path");

// Settings come from the StudioFlow .env (one .env for the whole project); a contracts/.env,
// if any, is read too. Only deploying to Sepolia needs them (SEPOLIA_PRIVATE_KEY, SEPOLIA_RPC_URL).
for (const file of [path.join(__dirname, "..", ".env"), path.join(__dirname, ".env")]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // No such file.
  }
}

const sepoliaKey = process.env.SEPOLIA_PRIVATE_KEY?.trim();

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  paths: { tests: "./test" },
  networks: {
    // Same port and chain id as the Ganache desktop app's default workspace.
    ganache: { url: "http://127.0.0.1:7545", chainId: 1337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: sepoliaKey ? [sepoliaKey] : [],
    },
  },
};
