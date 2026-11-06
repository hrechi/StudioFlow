import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    // "paris" : Ganache ne gère pas toujours PUSH0 (Shanghai) -> évite "invalid opcode" au déploiement.
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris" },
  },
  networks: {
    // Ganache GUI : http://127.0.0.1:7545 (chainId 1337) — Ganache CLI : port 8545
    ganache: {
      url: process.env.BLOCKCHAIN_RPC_URL ?? "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: process.env.STUDIO_PRIVATE_KEY ? [process.env.STUDIO_PRIVATE_KEY] : [],
    },
  },
};
export default config;
