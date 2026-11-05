/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 * Pure rules shared by the server, the browser and the tests (no database, no network):
 * id hashing, enum ↔ contract mapping, the wallet-link message and contract error messages.
 */
import { id as keccakText } from "ethers";
import type {
  ActionAllocation,
  EtatEquipement,
  EtatRetour,
  StatutAllocation,
} from "./allocation.types";

/**
 * On-chain id of a MongoDB document: keccak256 of its ObjectId string. The hash reveals
 * nothing about the document, but anyone holding the ObjectId can recompute and check it.
 */
export function hashId(mongoId: string): string {
  return keccakText(mongoId.toLowerCase());
}

/** Contract `enum Condition { New, Good, Worn, OutOfOrder }`. */
export const CONDITION_INDEX: Record<EtatEquipement, number> = {
  NEUF: 0,
  BON: 1,
  USE: 2,
  EN_PANNE: 3,
};
export const CONDITION_FROM_INDEX: readonly EtatEquipement[] = ["NEUF", "BON", "USE", "EN_PANNE"];

/** Contract `enum Status { None, Pending, Confirmed, InUse, Returned, Cancelled }`. */
export const STATUS_FROM_INDEX: readonly (StatutAllocation | null)[] = [
  null,
  "EN_ATTENTE",
  "CONFIRMEE",
  "EN_COURS",
  "RETOURNEE",
  "ANNULEE",
];

export function etatRetourFromIndex(index: number): EtatRetour | undefined {
  const etat = CONDITION_FROM_INDEX[index];
  return etat === "BON" || etat === "USE" ? etat : undefined;
}

/** The contract stores Unix seconds (uint64). */
export const toChainTime = (iso: string | Date) =>
  BigInt(Math.floor(new Date(iso).getTime() / 1000));
export const fromChainTime = (seconds: bigint | number) =>
  new Date(Number(seconds) * 1000).toISOString();

/** Contract event emitted by each action — the server looks for it in the receipt. */
export const EVENT_OF_ACTION: Record<ActionAllocation, string> = {
  REQUEST: "AllocationRequested",
  CONFIRM: "AllocationConfirmed",
  CHECKOUT: "EquipmentCheckedOut",
  RETURN: "EquipmentReturned",
  CANCEL: "AllocationCancelled",
};

export const ACTION_OF_EVENT: Record<string, ActionAllocation> = Object.fromEntries(
  Object.entries(EVENT_OF_ACTION).map(([action, event]) => [event, action as ActionAllocation]),
);

// ── Wallet link ──────────────────────────────────────────────────────────────

/** A signed link request is accepted for this long (replay window). */
export const LINK_MAX_AGE_MS = 10 * 60_000;

/**
 * Message the user signs in MetaMask to prove they own the wallet. It names the account and a
 * time, so a signature cannot be reused for another account or much later.
 */
export function walletLinkMessage(userId: string, issuedAt: string): string {
  return [
    "StudioFlow — link this wallet to my account.",
    "",
    `Account: ${userId}`,
    `Issued at: ${issuedAt}`,
    "",
    "Signing is free and does not send a transaction.",
  ].join("\n");
}

export function isLinkRequestFresh(issuedAt: string, now = Date.now()): boolean {
  const at = Date.parse(issuedAt);
  return Number.isFinite(at) && at <= now + 60_000 && now - at <= LINK_MAX_AGE_MS;
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Contract custom errors → message shown to the user. */
export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  NotOwner: "Only the studio admin wallet (contract owner) can do this.",
  NotStaff: "This wallet is not registered as staff on the blockchain. Ask the admin to add it.",
  NotOwnerOrBooker: "Only the admin or the photographer who booked can do this.",
  ZeroAddress: "Invalid wallet address.",
  EquipmentAlreadyRegistered: "This equipment is already registered on the blockchain.",
  EquipmentNotFound: "This equipment is not registered on the blockchain yet. Ask the admin.",
  EquipmentInactive: "This equipment is deactivated on the blockchain.",
  EquipmentOutOfOrder: "This equipment is out of order.",
  AllocationAlreadyExists: "This allocation already exists on the blockchain.",
  AllocationNotFound: "This allocation does not exist on the blockchain.",
  InvalidPeriod: "The end must be after the start.",
  Overlap: "This equipment is already allocated during this period (blockchain check).",
  InvalidTransition: "This step is not allowed from the allocation's current status.",
  InvalidReturnCondition: "On return, the condition can only be Good or Worn.",
};
