import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// One .env for the whole project: the StudioFlow folder's (shared by the app, Docker and here).
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    // "paris" : Ganache ne gère pas toujours PUSH0 (Shanghai) -> évite "invalid opcode" au déploiement.
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris" },
  },
  networks: {
    // The shared Ganache: `npm run ganache` in ../contracts (port 7545, chain id 1337).
    ganache: {
      url: process.env.BLOCKCHAIN_RPC_URL ?? "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: process.env.STUDIO_PRIVATE_KEY ? [process.env.STUDIO_PRIVATE_KEY] : [],
    },
  },
};
export default config;
