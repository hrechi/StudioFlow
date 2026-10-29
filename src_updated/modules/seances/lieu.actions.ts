"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import { objectIdSchema } from "./catalogue.schemas";
import { lieuSchema } from "./lieu.schemas";
import { createLieu, deleteLieu, setLieuDisponible, updateLieu } from "./lieu.service";

/**
 * Server Actions of the locations. Reading is open to the session team (area "seances"),
 * but creating / changing / deleting a location is ADMIN only, like the sessions themselves.
 */

function revalidate() {
  revalidatePath("/dashboard/lieux", "layout");
  revalidatePath("/dashboard/seances", "layout");
}

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createLieuAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = lieuSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createLieu(parsed.data);
    revalidate();
    return success(created);
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateLieuAction(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Location").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = lieuSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => updateLieu(parsedId.data, parsed.data));
}

export async function setLieuDisponibleAction(id: string, disponible: boolean): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Location").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => setLieuDisponible(parsedId.data, disponible === true));
}

export async function deleteLieuAction(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Location").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => deleteLieu(parsedId.data));
}
