/** Browser side of SnapSeal: wallet, contracts and file fingerprints (Ethers.js). */
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  type ContractRunner,
  type Eip1193Provider,
  type JsonRpcSigner,
  type Provider,
} from "ethers";
import deliveryAbi from "./abi/DeliveryReceipt.json";
import registryAbi from "./abi/SelectionRegistry.json";
import type { SnapSealConfig } from "./snapseal.types";

const CHAIN_NOT_ADDED = 4902;

export type InjectedWallet = Eip1193Provider & {
  on?: (event: string, listener: () => void) => void;
  removeListener?: (event: string, listener: () => void) => void;
};

/** What the contracts say about one gallery. Dates are Unix seconds; 0 means "not yet". */
export type ChainState = {
  photographer: string;
  client: string;
  photoCount: number;
  createdAt: number;
  selectionHashes: string[];
  selectedAt: number;
  deliveryHash: string | null;
  deliveredAt: number;
  confirmedAt: number;
};

export function getInjectedWallet(): InjectedWallet | null {
  return (window as unknown as { ethereum?: InjectedWallet }).ethereum ?? null;
}

export function registryContract(config: SnapSealConfig, runner: ContractRunner): Contract {
  return new Contract(config.registryAddress, registryAbi, runner);
}

export function deliveryContract(config: SnapSealConfig, runner: ContractRunner): Contract {
  return new Contract(config.deliveryAddress, deliveryAbi, runner);
}

export function readOnlyProvider(config: SnapSealConfig): Provider {
  return new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
}

/** Opens MetaMask, then moves it to the configured network (adding it when it is unknown). */
export async function connectWallet(
  wallet: InjectedWallet,
  config: SnapSealConfig,
): Promise<JsonRpcSigner> {
  const chainId = `0x${config.chainId.toString(16)}`;
  await wallet.request({ method: "eth_requestAccounts" });
  try {
    await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    if ((error as { code?: number }).code !== CHAIN_NOT_ADDED) throw error;
    await wallet.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: config.networkName,
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [config.rpcUrl],
          ...(config.explorerUrl ? { blockExplorerUrls: [config.explorerUrl] } : {}),
        },
      ],
    });
  }
  return new BrowserProvider(wallet).getSigner();
}

export async function readChainState(
  config: SnapSealConfig,
  provider: Provider,
  onChainId: number,
): Promise<ChainState> {
  const [gallery, selection, delivery] = await Promise.all([
    registryContract(config, provider).getGallery(onChainId),
    registryContract(config, provider).getSelection(onChainId),
    deliveryContract(config, provider).getDelivery(onChainId),
  ]);
  return {
    photographer: gallery.photographer,
    client: gallery.client,
    photoCount: Number(gallery.photoCount),
    createdAt: Number(gallery.createdAt),
    selectionHashes: [...selection.hashes],
    selectedAt: Number(selection.submittedAt),
    deliveryHash: Number(delivery.publishedAt) ? delivery.hash : null,
    deliveredAt: Number(delivery.publishedAt),
    confirmedAt: Number(delivery.confirmedAt),
  };
}

/** SHA-256 computed in the browser: the file itself is never uploaded. */
export async function sha256File(file: File): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error("Open Reframe over https or on localhost to compute a fingerprint.");
  }
  const digest = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"));
  return `0x${hex.join("")}`;
}

export function sameAddress(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function shorten(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

/** Turns wallet and contract errors into a sentence for the toast. */
export function explainChainError(error: unknown): string {
  const e = error as {
    code?: string | number;
    reason?: string | null;
    shortMessage?: string;
    message?: string;
    info?: unknown;
  };
  if (e.code === "ACTION_REJECTED" || e.code === 4001) return "Cancelled in MetaMask.";
  if (e.code === "INSUFFICIENT_FUNDS") {
    return "This wallet has no test ETH left to pay for the transaction.";
  }
  if (e.reason) return `Refused by the contract: ${e.reason}.`;
  // Ganache puts the reason in the node's error text, where Ethers doesn't decode it.
  const nodeReason = JSON.stringify(e.info ?? "").match(
    /VM Exception while processing transaction: revert ([^"\\]+)/,
  )?.[1];
  if (nodeReason) return `Refused by the contract: ${nodeReason}.`;
  if (e.code === "CALL_EXCEPTION") return "Refused by the contract.";
  return e.shortMessage ?? e.message ?? "The blockchain request failed. Please try again.";
}
