/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 *
 * Browser side of the blockchain: MetaMask connection, network switch to Ganache (1337),
 * contract calls signed by the user's wallet. Returns the tx hash; the server then verifies
 * it (blockchain.server.ts) before saving anything. No private key ever lives in the app.
 */
import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  Network,
  getAddress,
  type Eip1193Provider,
} from "ethers";
import { CONDITION_INDEX, CONTRACT_ERROR_MESSAGES, hashId, toChainTime } from "./allocation.rules";
import type { ChainConfig, EtatEquipement, EtatRetour } from "./allocation.types";
import deployment from "./contract/EquipmentAllocation.json";

type MetaMask = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

const contractInterface = new Interface(deployment.abi);

/** An error already worded for the user. */
export class WalletError extends Error {
  constructor(
    message: string,
    public readonly kind:
      "no-metamask" | "rejected" | "wrong-network" | "offline" | "contract" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "WalletError";
  }
}

function metaMask(): MetaMask | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: MetaMask }).ethereum ?? null;
}

function requireMetaMask(): MetaMask {
  const eth = metaMask();
  if (!eth) {
    throw new WalletError(
      "MetaMask is not installed. Add the MetaMask extension to your browser, then reload.",
      "no-metamask",
    );
  }
  return eth;
}

export const hasMetaMask = () => metaMask() !== null;
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const hexChainId = (id: number) => `0x${id.toString(16)}`;

/** Turns MetaMask / ethers / contract errors into one clear sentence. */
export function walletErrorMessage(error: unknown): WalletError {
  if (error instanceof WalletError) return error;
  const e = error as {
    code?: string | number;
    info?: { error?: { code?: number; message?: string } };
    data?: string;
    error?: { data?: string };
    revert?: { name?: string };
    message?: string;
  };
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001 || e?.info?.error?.code === 4001) {
    return new WalletError("You rejected the request in MetaMask.", "rejected");
  }
  // Custom error from the contract (Overlap, NotStaff…): decode it from the revert data.
  const name =
    e?.revert?.name ??
    (() => {
      const data = e?.data ?? e?.error?.data;
      try {
        return data ? contractInterface.parseError(data)?.name : undefined;
      } catch {
        return undefined;
      }
    })();
  if (name && CONTRACT_ERROR_MESSAGES[name]) {
    return new WalletError(CONTRACT_ERROR_MESSAGES[name], "contract");
  }
  // MetaMask wraps node errors as "could not coalesce error": look at the real one inside first.
  const raw = `${e?.message ?? ""} ${JSON.stringify(e?.info ?? "")}`;
  if (/nonce/i.test(raw)) {
    return new WalletError(
      "MetaMask's transaction count doesn't match the chain (Ganache was probably restarted). In MetaMask, clear this account's activity data, then try again.",
    );
  }
  if (
    e?.code === "NETWORK_ERROR" ||
    e?.code === -32603 ||
    /failed to fetch|ECONNREFUSED|could not coalesce/i.test(e?.message ?? "")
  ) {
    return new WalletError(
      "Cannot reach the blockchain. Is Ganache running (npm run ganache in the contracts folder)?",
      "offline",
    );
  }
  // ethers appends technical details in parentheses; our own messages are kept whole.
  const message = e?.message ?? "";
  return new WalletError(
    (e?.code ? message.split(" (")[0] : message).trim() || "The blockchain request failed.",
  );
}

// ── Connection ───────────────────────────────────────────────────────────────

/** Already-authorised account, without opening MetaMask (null if none). */
export async function getConnectedAccount(): Promise<string | null> {
  const eth = metaMask();
  if (!eth) return null;
  const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
  return accounts[0] ? getAddress(accounts[0]) : null;
}

/** Opens MetaMask to ask for the account. */
export async function connectWallet(): Promise<string> {
  try {
    const accounts = (await requireMetaMask().request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts[0]) throw new WalletError("No account selected in MetaMask.", "rejected");
    return getAddress(accounts[0]);
  } catch (error) {
    throw walletErrorMessage(error);
  }
}

export async function getWalletChainId(): Promise<number | null> {
  const eth = metaMask();
  if (!eth) return null;
  return Number.parseInt((await eth.request({ method: "eth_chainId" })) as string, 16);
}

/** Switches MetaMask to the Ganache network, adding it first if MetaMask doesn't know it. */
export async function ensureChain(config: ChainConfig): Promise<void> {
  const eth = requireMetaMask();
  if ((await getWalletChainId()) === config.chainId) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId(config.chainId) }],
    });
  } catch (error) {
    const code = (error as { code?: number; data?: { originalError?: { code?: number } } }).code;
    const original = (error as { data?: { originalError?: { code?: number } } }).data?.originalError
      ?.code;
    if (code !== 4902 && original !== 4902) {
      throw code === 4001
        ? new WalletError("Switch MetaMask to the Ganache network to continue.", "wrong-network")
        : walletErrorMessage(error);
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId(config.chainId),
            chainName: "Ganache StudioFlow",
            rpcUrls: [config.rpcUrl],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } catch (addError) {
      throw walletErrorMessage(addError);
    }
  }
}

/** Calls `handler` when the user changes account or network in MetaMask. */
export function onWalletChange(handler: () => void): () => void {
  const eth = metaMask();
  if (!eth?.on) return () => {};
  eth.on("accountsChanged", handler);
  eth.on("chainChanged", handler);
  return () => {
    eth.removeListener?.("accountsChanged", handler);
    eth.removeListener?.("chainChanged", handler);
  };
}

/** Free signature (no transaction): proves the user owns the wallet. */
export async function signMessage(config: ChainConfig, message: string): Promise<string> {
  try {
    const signer = await new BrowserProvider(requireMetaMask(), config.chainId).getSigner();
    return await signer.signMessage(message);
  } catch (error) {
    throw walletErrorMessage(error);
  }
}

// ── Contract calls ───────────────────────────────────────────────────────────

export type SentTx = { txHash: string; blockNumber: number };

/**
 * Simulates the call first (a revert shows its clear reason instead of a MetaMask warning),
 * then asks MetaMask to sign and waits for the block.
 */
async function send(config: ChainConfig, method: string, args: unknown[]): Promise<SentTx> {
  try {
    await ensureChain(config);
    const signer = await new BrowserProvider(requireMetaMask(), config.chainId).getSigner();
    const contract = new Contract(config.address, deployment.abi, signer);
    const fn = contract.getFunction(method);
    await fn.staticCall(...args);
    const tx = await fn(...args);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new WalletError("The transaction failed on the blockchain.", "contract");
    }
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    throw walletErrorMessage(error);
  }
}

export function requestAllocationTx(
  config: ChainConfig,
  a: {
    allocationId: string;
    materielId: string;
    seanceId: string;
    dateDebut: string;
    dateFin: string;
  },
) {
  return send(config, "requestAllocation", [
    hashId(a.allocationId),
    hashId(a.materielId),
    hashId(a.seanceId),
    toChainTime(a.dateDebut),
    toChainTime(a.dateFin),
  ]);
}

export const confirmAllocationTx = (config: ChainConfig, allocationId: string) =>
  send(config, "confirmAllocation", [hashId(allocationId)]);

export const checkoutTx = (config: ChainConfig, allocationId: string) =>
  send(config, "checkout", [hashId(allocationId)]);

export const returnEquipmentTx = (config: ChainConfig, allocationId: string, etat: EtatRetour) =>
  send(config, "returnEquipment", [hashId(allocationId), CONDITION_INDEX[etat]]);

export const cancelAllocationTx = (config: ChainConfig, allocationId: string) =>
  send(config, "cancelAllocation", [hashId(allocationId)]);

export const registerEquipmentTx = (
  config: ChainConfig,
  materielId: string,
  etat: EtatEquipement,
) => send(config, "registerEquipment", [hashId(materielId), CONDITION_INDEX[etat]]);

export const addStaffTx = (config: ChainConfig, address: string) =>
  send(config, "addStaff", [getAddress(address)]);

/** Read-only availability check straight from Ganache (no MetaMask needed). */
export async function isAvailableTx(
  config: ChainConfig,
  materielId: string,
  dateDebut: string,
  dateFin: string,
): Promise<boolean> {
  try {
    const provider = new JsonRpcProvider(config.rpcUrl, Network.from(config.chainId), {
      staticNetwork: true,
    });
    const contract = new Contract(config.address, deployment.abi, provider);
    return (await contract
      .getFunction("isAvailable")
      .staticCall(hashId(materielId), toChainTime(dateDebut), toChainTime(dateFin))) as boolean;
  } catch (error) {
    throw walletErrorMessage(error);
  }
}
