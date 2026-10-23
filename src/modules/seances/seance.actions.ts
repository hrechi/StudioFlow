"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import { objectIdSchema } from "./catalogue.schemas";
import { prixFinalSchema, seanceSchema, seanceStatutSchema } from "./seance.schemas";
import { createSeance, deleteSeance, setPrixFinal, setSeanceStatut, updateSeance } from "./seance.service";

const revalidate = () => revalidatePath("/dashboard/seances", "layout");

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createSeanceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = seanceSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createSeance(parsed.data);
    revalidate();
    return success(created);
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateSeanceAction(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Session").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = seanceSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updateSeance(parsedId.data, parsed.data));
}

export async function setSeanceStatutAction(id: string, statut: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Session").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = seanceStatutSchema.safeParse(statut);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => setSeanceStatut(parsedId.data, parsed.data));
}

export async function deleteSeanceAction(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Session").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deleteSeance(parsedId.data));
}

export async function setPrixFinalAction(id: string, prix: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Session").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = prixFinalSchema.safeParse(prix);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => setPrixFinal(parsedId.data, parsed.data));
}
