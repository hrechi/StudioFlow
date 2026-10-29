"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import {
  objectIdSchema,
  packSchema,
  packStatutSchema,
  packSuggestionInputSchema,
  prestationSchema,
  typeEvenementSchema,
} from "./catalogue.schemas";
import { createPack, deletePack, setPackStatut, updatePack } from "./pack.service";
import { suggererTextePack } from "./pack.suggestions";
import type { PackSuggestionDTO } from "./catalogue.types";
import {
  createPrestation,
  deletePrestation,
  setPrestationActif,
  updatePrestation,
} from "./prestation.service";
import {
  createTypeEvenement,
  deleteTypeEvenement,
  seedDefaultTypesEvenement,
  setTypeEvenementActif,
  updateTypeEvenement,
} from "./type-evenement.service";

/**
 * Server Actions of the catalogue (event types, services, packs).
 * Every action re-checks the "catalogue" permission (ADMIN only) and validates its input.
 */

function revalidateCatalogue() {
  revalidatePath("/dashboard/catalogue", "layout");
  revalidatePath("/packs");
  revalidatePath("/");
}

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    revalidateCatalogue();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

function parseId(id: unknown, label: string) {
  return objectIdSchema(label).safeParse(id);
}

// ── Event types ─────────────────────────────────────────────────────────────

export async function createTypeEvenementAction(input: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsed = typeEvenementSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => createTypeEvenement(parsed.data));
}

export async function updateTypeEvenementAction(id: string, input: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Event type");
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = typeEvenementSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updateTypeEvenement(parsedId.data, parsed.data));
}

export async function setTypeEvenementActifAction(id: string, actif: boolean): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Event type");
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => setTypeEvenementActif(parsedId.data, actif));
}

export async function deleteTypeEvenementAction(id: string): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Event type");
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deleteTypeEvenement(parsedId.data));
}

export async function seedDefaultTypesAction(): Promise<ActionResult<{ added: number }>> {
  await requireArea("catalogue");
  try {
    const added = await seedDefaultTypesEvenement();
    revalidateCatalogue();
    return success({ added });
  } catch (error) {
    return toFailure(error);
  }
}

// ── Services (prestations) ──────────────────────────────────────────────────

export async function createPrestationAction(input: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsed = prestationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => createPrestation(parsed.data));
}

export async function updatePrestationAction(id: string, input: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Service");
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = prestationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updatePrestation(parsedId.data, parsed.data));
}

export async function setPrestationActifAction(id: string, actif: boolean): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Service");
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => setPrestationActif(parsedId.data, actif));
}

export async function deletePrestationAction(id: string): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Service");
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deletePrestation(parsedId.data));
}

// ── Packs ───────────────────────────────────────────────────────────────────

export async function createPackAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireArea("catalogue");
  const parsed = packSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createPack(parsed.data);
    revalidateCatalogue();
    return success(created);
  } catch (error) {
    return toFailure(error);
  }
}

export async function updatePackAction(id: string, input: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Pack");
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = packSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updatePack(parsedId.data, parsed.data));
}

export async function setPackStatutAction(id: string, statut: unknown): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Pack");
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = packStatutSchema.safeParse(statut);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => setPackStatut(parsedId.data, parsed.data));
}

export async function deletePackAction(id: string): Promise<ActionResult> {
  await requireArea("catalogue");
  const parsedId = parseId(id, "Pack");
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deletePack(parsedId.data));
}

/**
 * Suggests a pack name and description (AI, or templates as fallback). Read only: nothing is
 * created or changed here, the admin applies a suggestion in the form and saves it themself.
 */
export async function suggestPackTextAction(input: unknown): Promise<ActionResult<PackSuggestionDTO>> {
  await requireArea("catalogue");
  const parsed = packSuggestionInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await suggererTextePack(parsed.data));
  } catch (error) {
    return toFailure(error);
  }
}
