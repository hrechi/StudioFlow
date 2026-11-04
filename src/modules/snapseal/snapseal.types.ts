/**
 * Module : SnapSeal (blockchain proof of a gallery's selection and delivery).
 * Added next to Photos & Galeries: it reads photos, it never changes them.
 */

/** Must match MAX_PHOTOS in contracts/contracts/SelectionRegistry.sol. */
export const SNAPSEAL_MAX_PHOTOS = 300;

/** Networks SnapSeal can run on (SNAPSEAL_NETWORK). Same values as contracts/hardhat.config.cjs. */
export const SNAPSEAL_NETWORKS = {
  sepolia: {
    chainId: 11155111,
    networkName: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
  },
  ganache: {
    chainId: 1337,
    networkName: "Ganache",
    rpcUrl: "http://127.0.0.1:7545",
    explorerUrl: null,
  },
} as const;

/** Null while the contracts are not deployed and configured in the environment. */
export type SnapSealConfig = {
  registryAddress: string;
  deliveryAddress: string;
  chainId: number;
  networkName: string;
  rpcUrl: string;
  explorerUrl: string | null; // a local chain has no block explorer
};

export type SealedPhoto = {
  photoId: string;
  nomFichier: string;
  hash: string; // 0x + SHA-256 of the original file
};

/** Link between a Reframe gallery and its on-chain gallery. The chain stays the source of truth. */
export type GalerieSealDTO = {
  onChainId: number;
  txHash: string;
  photos: SealedPhoto[];
};
