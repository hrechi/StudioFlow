import "server-only";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Couche ethers.js : lecture et écriture sur le smart contract ContractNotary.
 * Variables d'environnement requises :
 *   BLOCKCHAIN_RPC_URL   — ex. http://127.0.0.1:7545 (Ganache) ou http://127.0.0.1:8545 (Hardhat)
 *   NOTARY_ADDRESS       — adresse du contrat déployé
 *   STUDIO_PRIVATE_KEY   — clé privée du compte studio (jamais côté client)
 */
import { Contract, JsonRpcProvider, Wallet, ZeroAddress } from "ethers";
import type { StatutOnChain, VerificationResult } from "./contrat.types";

const ABI = [
  "function register(bytes32 hash, string docRef, address client)",
  "function amend(bytes32 oldHash, bytes32 newHash, string docRef, address client)",
  "function revoke(bytes32 hash, string reason)",
  "function verify(bytes32 hash) view returns (tuple(bytes32 hash, string docRef, uint64 registeredAt, address registeredBy, address client, uint64 clientSignedAt, uint8 status, bytes32 supersededBy))",
  "function versionsOf(string docRef) view returns (bytes32[])",
];

const STATUTS: StatutOnChain[] = ["INCONNU", "ACTIF", "REVOQUE", "REMPLACE"];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function toBytes32(sha256Hex: string): string {
  if (!/^[0-9a-f]{64}$/i.test(sha256Hex)) throw new Error("Invalid SHA-256 fingerprint.");
  return `0x${sha256Hex.toLowerCase()}`;
}

function provider() {
  return new JsonRpcProvider(requireEnv("BLOCKCHAIN_RPC_URL"));
}

/** Read-only: no private key needed — safe to call from public routes. */
function reader() {
  return new Contract(requireEnv("NOTARY_ADDRESS"), ABI, provider());
}

/** Write: studio account only — server-side, never exposed to the browser. */
function writer() {
  return new Contract(
    requireEnv("NOTARY_ADDRESS"),
    ABI,
    new Wallet(requireEnv("STUDIO_PRIVATE_KEY"), provider()),
  );
}

export type AnchorReceipt = {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  chainId: number;
};

/** Register a contract hash on-chain. `clientWallet` is optional (ZeroAddress if not provided). */
export async function anchorHash(
  sha256Hex: string,
  reference: string,
  clientWallet: string = ZeroAddress,
): Promise<AnchorReceipt> {
  const tx = await writer().register(toBytes32(sha256Hex), reference, clientWallet);
  const receipt = await tx.wait();
  const net = await provider().getNetwork();
  return {
    txHash: receipt.hash as string,
    blockNumber: receipt.blockNumber as number,
    contractAddress: requireEnv("NOTARY_ADDRESS"),
    chainId: Number(net.chainId),
  };
}

/** Revoke an anchored hash (studio only). */
export async function revokeHash(sha256Hex: string, reason: string): Promise<void> {
  const tx = await writer().revoke(toBytes32(sha256Hex), reason);
  await tx.wait();
}

/** Public verification — no wallet required. */
export async function verifyHash(sha256Hex: string): Promise<VerificationResult> {
  const r = await reader().verify(toBytes32(sha256Hex));
  const statut = STATUTS[Number(r.status)] ?? "INCONNU";
  if (statut === "INCONNU") return { found: false, statut };
  const iso = (s: bigint) => (s > BigInt(0) ? new Date(Number(s) * 1000).toISOString() : undefined);
  return {
    found: true,
    statut,
    reference: r.docRef as string,
    enregistreLe: iso(r.registeredAt),
    coSigneLe: iso(r.clientSignedAt),
    remplacePar: statut === "REMPLACE" ? (r.supersededBy as string) : undefined,
  };
}

/** Check if the blockchain node is reachable (used for health checks). */
export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    await provider().getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
