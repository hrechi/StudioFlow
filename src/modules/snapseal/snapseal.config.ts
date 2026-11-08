import { isAddress } from "ethers";
import { SNAPSEAL_NETWORKS, type SnapSealConfig } from "./snapseal.types";

/**
 * SnapSeal settings, read at request time (changing the addresses only needs a restart).
 * Its own file, with no other module imports, so the guards can use it without an import cycle
 * (photo.service → snapseal.guards → here; snapseal.service → photo.service).
 */
export function getSnapSealConfig(): SnapSealConfig | null {
  const registryAddress = process.env.SNAPSEAL_REGISTRY_ADDRESS?.trim() ?? "";
  const deliveryAddress = process.env.SNAPSEAL_DELIVERY_ADDRESS?.trim() ?? "";
  if (!isAddress(registryAddress) || !isAddress(deliveryAddress)) return null;
  const network =
    process.env.SNAPSEAL_NETWORK?.trim().toLowerCase() === "ganache"
      ? SNAPSEAL_NETWORKS.ganache
      : SNAPSEAL_NETWORKS.sepolia;
  return {
    registryAddress,
    deliveryAddress,
    ...network,
    rpcUrl: process.env.SNAPSEAL_RPC_URL?.trim() || network.rpcUrl,
  };
}

/**
 * Where the SERVER reads the chain. In Docker, 127.0.0.1 is the container itself, so it is
 * host.docker.internal:7545 there; the browser (MetaMask) keeps config.rpcUrl.
 */
export function getServerRpcUrl(config: SnapSealConfig): string {
  return process.env.SNAPSEAL_SERVER_RPC_URL?.trim() || config.rpcUrl;
}
