"use server";

import { revalidatePath } from "next/cache";
import { toFailure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import { devisIdSchema, devisInputSchema } from "./facturation.schema";
import { createDevis, deleteDevis, duplicateDevis, updateDevis } from "./devis.service";

const PATH = "/dashboard/facturation/devis";

export async function createDevisAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const parsed = devisInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await createDevis(parsed.data, actor);
    revalidatePath(PATH);
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
    revalidatePath(PATH);
    return success({ id: result.id });
  } catch (error) { return toFailure(error); }
}

export async function deleteDevisAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try { await deleteDevis(id, actor); revalidatePath(PATH); return success(); }
  catch (error) { return toFailure(error); }
}

export async function duplicateDevisAction(id: string): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  try { const result = await duplicateDevis(id, actor); revalidatePath(PATH); return success({ id: result.id }); }
  catch (error) { return toFailure(error); }
}
