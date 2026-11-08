import "server-only";
import { Interface, JsonRpcProvider, type Log } from "ethers";
import { ServiceError } from "@/lib/action-result";
import registryAbi from "./abi/SelectionRegistry.json";
import { readChainState, type ChainState } from "./snapseal.chain";
import { getServerRpcUrl } from "./snapseal.config";
import type { SnapSealConfig } from "./snapseal.types";

/**
 * Server side of SnapSeal: READ-ONLY access to the contracts (D8: the server never holds a
 * private key, only wallets sign, in the browser). Every gate decision starts here.
 */

/** The chain could not be read. Gates refuse (D5: fail closed) and routes answer 503. */
export class ChainUnavailableError extends ServiceError {
  constructor() {
    super(
      "The blockchain can't be reached right now, so this step can't be checked. Please try again in a moment.",
    );
    this.name = "ChainUnavailableError";
  }
}

const TIMEOUT_MS = 5_000;
const providers = new Map<string, JsonRpcProvider>();

function provider(config: SnapSealConfig): JsonRpcProvider {
  const url = getServerRpcUrl(config);
  let p = providers.get(url);
  if (!p) {
    // staticNetwork: no auto-detection, so an offline node fails fast instead of retrying forever.
    // cacheTimeout -1: no reuse of an identical request's answer (ethers keeps one for 250 ms),
    // so a sync right after a transaction never reads the state from just before it.
    p = new JsonRpcProvider(url, config.chainId, { staticNetwork: true, cacheTimeout: -1 });
    providers.set(url, p);
  }
  return p;
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** The four steps of one on-chain gallery, as the contracts store them. */
export async function readGalleryState(
  config: SnapSealConfig,
  onChainId: number,
): Promise<ChainState> {
  try {
    return await withTimeout(readChainState(config, provider(config), onChainId));
  } catch (error) {
    console.error("[SnapSeal] chain read failed", error);
    throw new ChainUnavailableError();
  }
}

export type SealReceipt = {
  onChainId: number;
  photographer: string;
  client: string;
  hashes: string[];
};

const registryInterface = new Interface(registryAbi);

/**
 * What a "create gallery" transaction really did, read from its receipt (never from the
 * browser): the GalleryCreated event emitted by OUR registry contract.
 */
export async function readSealReceipt(config: SnapSealConfig, txHash: string): Promise<SealReceipt> {
  let receipt;
  try {
    receipt = await withTimeout(provider(config).getTransactionReceipt(txHash));
  } catch (error) {
    console.error("[SnapSeal] receipt read failed", error);
    throw new ChainUnavailableError();
  }
  if (!receipt) throw new ServiceError("This transaction was not found on the blockchain.");
  if (receipt.status !== 1) throw new ServiceError("This transaction failed on the blockchain.");

  const registry = config.registryAddress.toLowerCase();
  for (const log of receipt.logs as readonly Log[]) {
    if (log.address.toLowerCase() !== registry) continue;
    const parsed = registryInterface.parseLog(log);
    if (parsed?.name !== "GalleryCreated") continue;
    return {
      onChainId: Number(parsed.args.id),
      photographer: String(parsed.args.photographer).toLowerCase(),
      client: String(parsed.args.client).toLowerCase(),
      hashes: (parsed.args.hashes as string[]).map((h) => h.toLowerCase()),
    };
  }
  throw new ServiceError("This transaction did not create a gallery in the SnapSeal contract.");
}
