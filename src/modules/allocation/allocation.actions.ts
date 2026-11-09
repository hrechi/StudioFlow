"use server";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import { hashId, toChainTime, walletLinkMessage } from "./allocation.rules";
import {
  allocationRecordSchema,
  allocationRequestSchema,
  allocationStepSchema,
  equipmentRegisteredSchema,
  staffAddedSchema,
  walletLinkSchema,
} from "./allocation.schemas";
import {
  linkWallet,
  prepareAllocation,
  recordAllocationStep,
  recordRequestedAllocation,
  verifyEquipmentRegistered,
  verifyStaffAdded,
} from "./allocation.service";
import { availabilityDetails, type AvailabilityDetails } from "./blockchain.server";

/**
 * Staff (ADMIN + PHOTOGRAPHE) use this page. Every action that follows a MetaMask signature
 * receives a tx hash that the service verifies on the chain before saving anything.
 */
const revalidate = () => revalidatePath("/dashboard/allocation", "layout");

async function runWith<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    revalidate();
    return success(data);
  } catch (error) {
    return toFailure(error);
  }
}

// ── Wallet ───────────────────────────────────────────────────────────────────

/** The text to sign in MetaMask to link a wallet (bound to this account and this moment). */
export async function getWalletLinkMessageAction(): Promise<
  ActionResult<{ message: string; issuedAt: string }>
> {
  const user = await requireArea("dashboard");
  const issuedAt = new Date().toISOString();
  return success({ message: walletLinkMessage(user.id, issuedAt), issuedAt });
}

export async function linkWalletAction(input: unknown): Promise<ActionResult<{ address: string }>> {
  const user = await requireArea("dashboard");
  const parsed = walletLinkSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runWith(async () => ({ address: await linkWallet(user, parsed.data) }));
}

// ── Booking: prepare → (MetaMask) → record ───────────────────────────────────

export async function prepareAllocationAction(
  input: unknown,
): Promise<ActionResult<{ allocationId: string; walletAddress: string }>> {
  const user = await requireRole("ADMIN", "PHOTOGRAPHE");
  const parsed = allocationRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await prepareAllocation(user, parsed.data));
  } catch (error) {
    return toFailure(error);
  }
}

export async function recordAllocationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; txHash: string; blockNumber: number }>> {
  const user = await requireRole("ADMIN", "PHOTOGRAPHE");
  const parsed = allocationRecordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runWith(() => recordRequestedAllocation(user, parsed.data));
}

/** Confirm / checkout / return / cancel, after the user signed the step in MetaMask. */
export async function recordAllocationStepAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("ADMIN", "PHOTOGRAPHE");
  const parsed = allocationStepSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const result = await runWith(() => recordAllocationStep(user, parsed.data));
  return result.ok ? success() : result;
}

/** Live "available on the blockchain?" for the form (server-side read, no MetaMask needed). */
export async function checkAvailabilityAction(
  input: unknown,
): Promise<ActionResult<AvailabilityDetails>> {
  await requireArea("dashboard");
  const parsed = allocationRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    // The contract's answer, with the reason when it is "no" (shown as-is in the form).
    return success(
      await availabilityDetails(
        hashId(parsed.data.materielId),
        toChainTime(parsed.data.dateDebut),
        toChainTime(parsed.data.dateFin),
      ),
    );
  } catch (error) {
    return toFailure(error);
  }
}

// ── Admin tools ──────────────────────────────────────────────────────────────

export async function confirmEquipmentRegisteredAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = equipmentRegisteredSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const result = await runWith(() =>
    verifyEquipmentRegistered(admin, parsed.data.materielId, parsed.data.txHash),
  );
  return result.ok ? success() : result;
}

export async function confirmStaffAddedAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = staffAddedSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const result = await runWith(() =>
    verifyStaffAdded(admin, parsed.data.utilisateurId, parsed.data.txHash),
  );
  return result.ok ? success() : result;
}
