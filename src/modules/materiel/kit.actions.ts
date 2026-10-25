"use server";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea } from "@/lib/guards";
import { suggererKit } from "./kit.analyse";
import { objectIdSchema } from "./materiel.schemas";
import type { KitSuggereDTO } from "./materiel.types";

/**
 * Suggests a kit (AI, or history fallback) — read only, nothing is reserved here. Anyone allowed
 * to reserve equipment may ask; reserving the kit goes through createReservationsAction.
 */
export async function suggestKitAction(seanceId: string): Promise<ActionResult<KitSuggereDTO>> {
  await requireArea("materiel");
  const parsedId = objectIdSchema("Session").safeParse(seanceId);
  if (!parsedId.success) return validationFailure(parsedId.error);
  try {
    return success(await suggererKit(parsedId.data));
  } catch (error) {
    return toFailure(error);
  }
}
