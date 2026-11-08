import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// One .env for the whole project: the StudioFlow folder's (shared by the app, Docker and here).
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
// Also load local overrides (.env.local takes precedence)
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true, override: true });

const accounts = process.env.STUDIO_PRIVATE_KEY ? [process.env.STUDIO_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris" },
  },
  networks: {
    // Local Ganache (dev only)
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts,
    },
    // Sepolia testnet (production / Vercel)
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL ?? "",
      chainId: 11155111,
      accounts,
    },
  },
};
export default config;
