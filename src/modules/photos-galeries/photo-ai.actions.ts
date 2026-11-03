"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import {
  analyseGalerie,
  analysePhoto,
  autoCullGalerie,
  searchPhotos,
  storyOrderGalerie,
  suggestPhotoEdit,
  type CullingSummary,
  type PhotoEditSuggestion,
  type PhotoSearchResult,
} from "./photo-ai.service";

const idSchema = z.object({ id: z.string().min(1) });
const editSuggestionSchema = z.object({
  id: z.string().min(1),
  instruction: z.string().trim().max(300).optional(),
});
const searchSchema = z.object({ query: z.string().trim().min(2, "Describe the photos").max(300) });

function revalidatePhotos() {
  revalidatePath("/dashboard/photos", "layout");
  revalidatePath("/dashboard/galeries", "layout");
  revalidatePath("/espace-client/galeries", "layout");
}

/** Auto-cull the pending photos of a gallery (analyses the missing photos first). */
export async function autoCullGalerieAction(input: unknown): Promise<ActionResult<CullingSummary>> {
  await requireArea("photos-galeries");
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const summary = await autoCullGalerie(parsed.data.id);
    revalidatePhotos();
    return success(summary);
  } catch (error) {
    return toFailure(error);
  }
}

export async function storyOrderAction(
  input: unknown,
): Promise<ActionResult<{ ordered: number; summary: string }>> {
  await requireArea("photos-galeries");
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await storyOrderGalerie(parsed.data.id);
    revalidatePhotos();
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/** (Re-)analyse every photo of a gallery that has no AI analysis yet. */
export async function analyseGalerieAction(
  input: unknown,
): Promise<ActionResult<{ analysed: number; failed: number }>> {
  await requireArea("photos-galeries");
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await analyseGalerie(parsed.data.id);
    revalidatePhotos();
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/** Re-runs the AI analysis of one photo. */
export async function analysePhotoAction(input: unknown): Promise<ActionResult> {
  await requireArea("photos-galeries");
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const ok = await analysePhoto(parsed.data.id);
  revalidatePhotos();
  return ok ? success() : toFailure(new Error("The AI analysis failed. Try again in a moment."));
}

/** Editor settings proposed by Claude for one photo (auto-enhance, or a described look). */
export async function suggestPhotoEditAction(
  input: unknown,
): Promise<ActionResult<PhotoEditSuggestion>> {
  await requireArea("photos-galeries");
  const parsed = editSuggestionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await suggestPhotoEdit(parsed.data.id, parsed.data.instruction));
  } catch (error) {
    return toFailure(error);
  }
}

export async function searchPhotosAction(input: unknown): Promise<ActionResult<PhotoSearchResult>> {
  await requireArea("photos-galeries");
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await searchPhotos(parsed.data.query));
  } catch (error) {
    return toFailure(error);
  }
}
