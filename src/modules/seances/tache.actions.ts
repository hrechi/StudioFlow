"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import { objectIdSchema } from "./catalogue.schemas";
import { tacheSchema, tacheStatutSchema } from "./tache.schemas";
import {
  createTache,
  deleteTache,
  generateTachesForSeance,
  setTacheStatut,
  updateTache,
} from "./tache.service";

const revalidate = () => revalidatePath("/dashboard/taches");

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createTacheAction(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = tacheSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => createTache(parsed.data));
}

export async function updateTacheAction(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Task").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = tacheSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updateTache(parsedId.data, parsed.data));
}

export async function setTacheStatutAction(id: string, statut: unknown): Promise<ActionResult> {
  const user = await requireArea("seances");
  const parsedId = objectIdSchema("Task").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = tacheStatutSchema.safeParse(statut);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => setTacheStatut(parsedId.data, parsed.data, user));
}

export async function deleteTacheAction(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Task").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deleteTache(parsedId.data));
}

export async function generateTachesAction(seanceId: string): Promise<ActionResult<{ created: number }>> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Session").safeParse(seanceId);
  if (!parsedId.success) return validationFailure(parsedId.error);
  try {
    const created = await generateTachesForSeance(parsedId.data);
    revalidate();
    return success({ created });
  } catch (error) {
    return toFailure(error);
  }
}
