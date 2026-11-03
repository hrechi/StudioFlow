"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import { deletePhotosSchema, setCullingSchema } from "./galerie.schemas";
import { deletePhotos, setCulling } from "./photo.service";

/** Uploads go through POST /api/photos/upload (Server Actions cap request bodies at 1 MB). */

function revalidatePhotos() {
  revalidatePath("/dashboard/photos", "layout");
  revalidatePath("/dashboard/galeries", "layout");
  revalidatePath("/espace-client/galeries", "layout");
}

export async function setCullingAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  await requireArea("photos-galeries");
  const parsed = setCullingSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const count = await setCulling(parsed.data.ids, parsed.data.statut);
    revalidatePhotos();
    return success({ count });
  } catch (error) {
    return toFailure(error);
  }
}

export async function deletePhotosAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  await requireArea("photos-galeries");
  const parsed = deletePhotosSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const count = await deletePhotos(parsed.data.ids);
    revalidatePhotos();
    return success({ count });
  } catch (error) {
    return toFailure(error);
  }
}
