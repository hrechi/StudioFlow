"use server";

import { revalidatePath } from "next/cache";
import { failure, toFailure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import {
  devisIdSchema,
  devisInputSchema,
  paiementFormSchema,
  rejetDeclarationSchema,
  reponseDevisSchema,
} from "./facturation.schema";
import {
  answerDevis,
  cancelFactures,
  createDevis,
  deleteDevis,
  duplicateDevis,
  regenerateFactures,
  recordPaiement,
  sendDevis,
  suggestDevisLignes,
  updateDevis,
  withdrawDevis,
} from "./devis.service";
import { toMillimes } from "./facturation.utils";
import {
  confirmPaiementEnLigne,
  rejectDeclaration,
  startPaiementEnLigne,
  validateDeclaration,
} from "./paiement.service";
import { analyserDeclaration } from "./preuve.analyse";
import type { LignePrestation } from "./facturation.types";

const PATH = "/dashboard/facturation/devis";

/** Every billing screen shows the same quotes and invoices: refresh them together. */
function revalidateBilling(devisId?: string) {
  revalidatePath(PATH);
  if (devisId) revalidatePath(`${PATH}/${devisId}`);
  revalidatePath("/dashboard/facturation/factures");
  revalidatePath("/espace-client/factures");
  revalidatePath("/espace-client");
}

export async function createDevisAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const parsed = devisInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await createDevis(parsed.data, actor);
    revalidateBilling(result.id);
    return success({ id: result.id });
  } catch (error) { return toFailure(error); }
}

export async function updateDevisAction(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const idResult = devisIdSchema.safeParse(id);
  const parsed = devisInputSchema.safeParse(input);
  if (!idResult.success) return validationFailure(idResult.error);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await updateDevis(id, parsed.data, actor);
    revalidateBilling(id);
    return success({ id: result.id });
  } catch (error) { return toFailure(error); }
}

export async function deleteDevisAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await deleteDevis(id, actor); revalidateBilling(); return success(); }
  catch (error) { return toFailure(error); }
}

export async function duplicateDevisAction(id: string): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  try { const result = await duplicateDevis(id, actor); revalidateBilling(result.id); return success({ id: result.id }); }
  catch (error) { return toFailure(error); }
}

export async function sendDevisAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await sendDevis(id, actor); revalidateBilling(id); return success(); }
  catch (error) { return toFailure(error); }
}

export async function withdrawDevisAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await withdrawDevis(id, actor); revalidateBilling(id); return success(); }
  catch (error) { return toFailure(error); }
}

/** Client portal: accept (choosing the payment plan and method) or decline a sent quote. */
export async function answerDevisAction(id: string, input: unknown): Promise<ActionResult> {
  const actor = await requireRole("CLIENT");
  const parsed = reponseDevisSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try { await answerDevis(id, parsed.data, actor); revalidateBilling(id); return success(); }
  catch (error) { return toFailure(error); }
}

export async function suggestDevisAction(seanceId: string): Promise<ActionResult<{ lignes: LignePrestation[]; source: string }>> {
  const actor = await requireRole("ADMIN");
  try { return success(await suggestDevisLignes(seanceId, actor)); }
  catch (error) { return toFailure(error); }
}

export async function regenerateFacturesAction(devisId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await regenerateFactures(devisId, actor); revalidateBilling(devisId); return success(); }
  catch (error) { return toFailure(error); }
}

export async function recordPaiementAction(devisId: string, factureId: string, input: unknown): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = paiementFormSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await recordPaiement(devisId, factureId, { ...parsed.data, montant: toMillimes(parsed.data.montant) }, actor);
    revalidateBilling(devisId);
    return success();
  } catch (error) { return toFailure(error); }
}

export async function cancelFacturesAction(devisId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await cancelFactures(devisId, actor); revalidateBilling(devisId); return success(); }
  catch (error) { return toFailure(error); }
}

// ── Payments: proofs (offline) and online checkout ──────────────────────────

export async function validateDeclarationAction(devisId: string, factureId: string, declarationId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await validateDeclaration(devisId, factureId, declarationId, actor); revalidateBilling(devisId); return success(); }
  catch (error) { return toFailure(error); }
}

export async function rejectDeclarationAction(devisId: string, factureId: string, declarationId: string, input: unknown): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = rejetDeclarationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try { await rejectDeclaration(devisId, factureId, declarationId, parsed.data.motif, actor); revalidateBilling(devisId); return success(); }
  catch (error) { return toFailure(error); }
}

/** Client: starts an online checkout; the browser then goes to the returned URL. */
export async function startPaiementEnLigneAction(devisId: string, factureId: string, passerelle: unknown): Promise<ActionResult<{ url: string }>> {
  const actor = await requireRole("CLIENT");
  if (passerelle !== "KONNECT" && passerelle !== "STRIPE" && passerelle !== "SIMULATION") return failure("Choose a payment method.");
  try { return success(await startPaiementEnLigne(devisId, factureId, passerelle, actor)); }
  catch (error) { return toFailure(error); }
}

/** Development only: outcome chosen on the local test payment page. */
export async function simulatePaiementAction(ref: string, reussi: boolean): Promise<ActionResult<{ statut: string }>> {
  const actor = await requireRole("CLIENT");
  try {
    const statut = await confirmPaiementEnLigne(ref, { success: reussi === true, actor });
    revalidateBilling();
    return success({ statut });
  } catch (error) { return toFailure(error); }
}

/** Admin: runs the AI proof check again (e.g. after a Gemini outage). */
export async function reanalyserPreuveAction(devisId: string, factureId: string, declarationId: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  try {
    const analyse = await analyserDeclaration(devisId, factureId, declarationId);
    if (!analyse) return failure("This declaration has no proof to analyse.");
    revalidateBilling(devisId);
    return success();
  } catch (error) { return toFailure(error); }
}
