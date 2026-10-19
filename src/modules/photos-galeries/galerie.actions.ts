"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import {
  createGalerie,
  deleteGalerie,
  setCouverture,
  updateGalerie,
  updateGalerieSharing,
} from "./galerie.service";
import {
  galerieCreateSchema,
  galerieShareSchema,
  galerieUpdateSchema,
  setCouvertureSchema,
} from "./galerie.schemas";
import type { Galerie } from "./galerie.types";

const GALERIES_PATH = "/dashboard/galeries";

function revalidateGaleries() {
  revalidatePath(GALERIES_PATH, "layout");
  revalidatePath("/dashboard/photos", "layout");
  revalidatePath("/espace-client/galeries", "layout");
}

export async function createGalerieAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireArea("photos-galeries");
  const parsed = galerieCreateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const created = await createGalerie(parsed.data);
    revalidateGaleries();
    return success({ id: created.id });
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateGalerieAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Galerie>> {
  await requireArea("photos-galeries");
  const parsed = galerieUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await updateGalerie(id, parsed.data);
    revalidateGaleries();
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

/** Saves the share settings; `partager` also shares a gallery still in culling. */
export async function shareGalerieAction(
  id: string,
  input: unknown,
  partager: boolean,
): Promise<ActionResult<Galerie>> {
  await requireArea("photos-galeries");
  const parsed = galerieShareSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await updateGalerieSharing(id, parsed.data, partager);
    revalidateGaleries();
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function setCouvertureAction(input: unknown): Promise<ActionResult> {
  await requireArea("photos-galeries");
  const parsed = setCouvertureSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await setCouverture(parsed.data.galerieId, parsed.data.photoId);
    revalidateGaleries();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteGalerieAction(id: string): Promise<ActionResult> {
  await requireArea("photos-galeries");
  try {
    await deleteGalerie(id);
    revalidateGaleries();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
