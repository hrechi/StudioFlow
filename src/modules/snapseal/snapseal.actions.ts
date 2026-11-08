"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  failure,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { computeGalerieHashes, getSnapSealConfig, recordGalerieSeal } from "./snapseal.service";
import type { SealedPhoto } from "./snapseal.types";

const recordSealSchema = z.object({
  galerieId: z.string().min(1),
  onChainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  photos: z
    .array(
      z.object({
        photoId: z.string().min(1),
        nomFichier: z.string().min(1),
        hash: z.string().regex(/^0x[0-9a-f]{64}$/),
      }),
    )
    .min(1),
});

/** Staff only: fingerprints to publish. The browser signs them with the photographer's wallet. */
export async function prepareSealAction(galerieId: string): Promise<ActionResult<SealedPhoto[]>> {
  await requireArea("photos-galeries");
  try {
    const galerie = await getGalerieById(galerieId);
    if (!galerie) return failure("Gallery not found.");
    return success(await computeGalerieHashes(galerie.id));
  } catch (error) {
    return toFailure(error);
  }
}

/** Staff only: remembers which on-chain gallery was just created for this gallery. */
export async function recordSealAction(input: unknown): Promise<ActionResult> {
  await requireArea("photos-galeries");
  const parsed = recordSealSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const config = getSnapSealConfig();
  if (!config) return failure("SnapSeal is not configured.");

  try {
    const galerie = await getGalerieById(parsed.data.galerieId);
    if (!galerie) return failure("Gallery not found.");
    await recordGalerieSeal({ ...parsed.data, registryAddress: config.registryAddress });
    revalidatePath(`/dashboard/galeries/${galerie.id}/snapseal`);
    revalidatePath(`/espace-client/galeries/${galerie.id}/snapseal`);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
