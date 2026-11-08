/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 *
 * Server side of the blockchain: a read-only JSON-RPC connection to Ganache (no private key
 * here — every write is signed by the user's MetaMask in the browser).
 * Its main job is `verifyTransaction`: a tx hash sent by the browser is never trusted until
 * the receipt proves it succeeded, hit our contract, was signed by the user's wallet and
 * emitted the expected event with the expected values.
 */
import "server-only";
import { Contract, JsonRpcProvider, Network, type EventLog, type Log } from "ethers";
import { ServiceError } from "@/lib/action-result";
import {
  ACTION_OF_EVENT,
  CONDITION_FROM_INDEX,
  EVENT_OF_ACTION,
  STATUS_FROM_INDEX,
  etatRetourFromIndex,
  fromChainTime,
} from "./allocation.rules";
import type {
  ActionAllocation,
  ChainAllocation,
  ChainConfig,
  ChainEvent,
  EquipementChain,
} from "./allocation.types";
import deployment from "./contract/EquipmentAllocation.json";

const CONTRACT_ADDRESS = deployment.address.toLowerCase();
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? deployment.chainId);
/** The server may reach Ganache by another URL than the browser (e.g. from Docker). */
const SERVER_RPC_URL =
  process.env.GANACHE_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";

const OFFLINE =
  "The blockchain is unreachable. Start Ganache (npm run ganache in StudioFlow-Blockchain) and try again.";

let provider: JsonRpcProvider | undefined;
let contract: Contract | undefined;

function getContract(): Contract {
  // staticNetwork: no network auto-detection, so an offline Ganache fails fast instead of retrying.
  provider ??= new JsonRpcProvider(SERVER_RPC_URL, Network.from(CHAIN_ID), { staticNetwork: true });
  contract ??= new Contract(CONTRACT_ADDRESS, deployment.abi, provider);
  return contract;
}

function isNetworkError(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  return (
    e?.code === "NETWORK_ERROR" ||
    e?.code === "TIMEOUT" ||
    e?.code === "SERVER_ERROR" ||
    e?.code === "ECONNREFUSED" ||
    e?.cause?.code === "ECONNREFUSED" ||
    /ECONNREFUSED|fetch failed/i.test(e?.message ?? "")
  );
}

/** Runs a chain read, turning connection problems into a clear ServiceError. */
async function onChain<T>(fn: (c: Contract, p: JsonRpcProvider) => Promise<T>): Promise<T> {
  const c = getContract();
  try {
    return await fn(c, provider!);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (isNetworkError(error)) throw new ServiceError(OFFLINE);
    throw error;
  }
}

/** Public settings for the browser: where the contract is and which chain MetaMask must use. */
export function getChainConfig(): ChainConfig {
  return {
    address: deployment.address,
    chainId: CHAIN_ID,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
  };
}

/** True when Ganache answers and the contract exists at the configured address. */
export async function checkChain(): Promise<{ reachable: boolean; deployed: boolean }> {
  try {
    const code = await getContract().runner!.provider!.getCode(CONTRACT_ADDRESS);
    return { reachable: true, deployed: code !== "0x" };
  } catch {
    return { reachable: false, deployed: false };
  }
}

const same = (a: unknown, b: unknown) =>
  typeof a === "bigint" || typeof b === "bigint"
    ? BigInt(a as bigint) === BigInt(b as bigint)
    : String(a).toLowerCase() === String(b).toLowerCase();

export type VerifiedTx = { blockNumber: number; at: Date; args: Record<string, unknown> };

/**
 * Proves a transaction before anything is saved:
 * 1. the receipt exists and succeeded (status 1);
 * 2. it was sent to our contract;
 * 3. it was signed by `expectedFrom` (the user's linked wallet);
 * 4. it emitted `event` with every value in `expected` (e.g. the allocation id).
 */
export async function verifyTransaction({
  txHash,
  expectedFrom,
  event,
  expected,
}: {
  txHash: string;
  expectedFrom: string;
  event: string;
  expected: Record<string, unknown>;
}): Promise<VerifiedTx> {
  return onChain(async (c, p) => {
    // The browser waits for the block before calling us, so a short wait is enough; a timeout
    // here means "unknown hash", not "Ganache offline".
    const receipt =
      (await p.getTransactionReceipt(txHash)) ??
      (await p.waitForTransaction(txHash, 1, 3_000).catch((error: { code?: string }) => {
        if (error?.code === "TIMEOUT") return null;
        throw error;
      }));
    if (!receipt) throw new ServiceError("This transaction was not found on the blockchain.");
    if (receipt.status !== 1) throw new ServiceError("This transaction failed on the blockchain.");
    if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS) {
      throw new ServiceError("This transaction was not sent to the StudioFlow contract.");
    }
    if (receipt.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      throw new ServiceError(
        "This transaction was signed by another wallet than the one linked to your account.",
      );
    }

    const match = receipt.logs
      .filter((log: Log) => log.address.toLowerCase() === CONTRACT_ADDRESS)
      .map((log: Log) => c.interface.parseLog(log))
      .find(
        (parsed) =>
          parsed?.name === event &&
          Object.entries(expected).every(([key, value]) => same(parsed.args.getValue(key), value)),
      );
    if (!match) {
      throw new ServiceError(`The transaction does not contain the expected ${event} event.`);
    }

    const block = await p.getBlock(receipt.blockNumber);
    return {
      blockNumber: receipt.blockNumber,
      at: new Date(Number(block?.timestamp ?? 0) * 1000),
      args: match.args.toObject(),
    };
  });
}

/** What the contract stores for an allocation, or null if it does not exist there. */
export async function readChainAllocation(chainAllocationId: string): Promise<ChainAllocation> {
  return onChain(async (c) => {
    try {
      const a = await c.getFunction("getAllocation").staticCall(chainAllocationId);
      const statut = STATUS_FROM_INDEX[Number(a.status)];
      if (!statut) return null;
      return {
        statut,
        bookedBy: String(a.bookedBy).toLowerCase(),
        dateDebut: fromChainTime(a.start),
        dateFin: fromChainTime(a.end),
        etatRetour:
          statut === "RETOURNEE" ? etatRetourFromIndex(Number(a.returnCondition)) : undefined,
      };
    } catch (error) {
      if (isNetworkError(error)) throw error;
      return null; // AllocationNotFound revert
    }
  });
}

/** Every event of one allocation, oldest first — the history timeline. */
export async function readAllocationEvents(chainAllocationId: string): Promise<ChainEvent[]> {
  return onChain(async (c, p) => {
    const batches = await Promise.all(
      Object.values(EVENT_OF_ACTION).map((name) =>
        c.queryFilter(c.getEvent(name)(chainAllocationId), 0, "latest"),
      ),
    );
    const logs = (batches.flat() as EventLog[]).sort(
      (a, b) => a.blockNumber - b.blockNumber || a.index - b.index,
    );
    const blocks = new Map<number, number>();
    for (const n of new Set(logs.map((l) => l.blockNumber))) {
      blocks.set(n, Number((await p.getBlock(n))?.timestamp ?? 0));
    }
    return logs.map((log) => {
      const action: ActionAllocation = ACTION_OF_EVENT[log.eventName];
      const args = log.args.toObject();
      return {
        action,
        wallet: String(action === "REQUEST" ? args.bookedBy : args.by).toLowerCase(),
        blockNumber: log.blockNumber,
        txHash: log.transactionHash.toLowerCase(),
        at: new Date((blocks.get(log.blockNumber) ?? 0) * 1000).toISOString(),
        etatRetour: action === "RETURN" ? etatRetourFromIndex(Number(args.condition)) : undefined,
      };
    });
  });
}

/** Live availability check, the same call the browser makes before signing. */
export async function isAvailableOnChain(equipmentHash: string, start: bigint, end: bigint) {
  return onChain(
    (c) => c.getFunction("isAvailable").staticCall(equipmentHash, start, end) as Promise<boolean>,
  );
}

export async function readEquipments(hashes: string[]): Promise<EquipementChain[]> {
  return onChain((c) =>
    Promise.all(
      hashes.map(async (hash) => {
        const e = await c.getFunction("equipments").staticCall(hash);
        return e.exists
          ? {
              registered: true,
              etat: CONDITION_FROM_INDEX[Number(e.condition)],
              active: Boolean(e.active),
            }
          : { registered: false };
      }),
    ),
  );
}

export async function readRoles(address: string): Promise<{ owner: boolean; staff: boolean }> {
  return onChain(async (c) => {
    const [owner, staff] = await Promise.all([
      c.getFunction("owner").staticCall() as Promise<string>,
      c.getFunction("staff").staticCall(address) as Promise<boolean>,
    ]);
    return { owner: owner.toLowerCase() === address.toLowerCase(), staff };
  });
}
