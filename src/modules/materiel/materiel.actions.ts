"use server";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import { materielSchema, objectIdSchema } from "./materiel.schemas";
import { archiveMateriel, createMateriel, updateMateriel } from "./materiel.service";

// Reads go through the pages (requireArea("materiel") + service); only writes need actions.
const revalidate = () => revalidatePath("/dashboard/materiel", "layout");

export async function createMaterielAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = materielSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createMateriel(parsed.data);
    revalidate();
    return success(created);
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateMaterielAction(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Equipment").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = materielSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateMateriel(parsedId.data, parsed.data);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function archiveMaterielAction(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsedId = objectIdSchema("Equipment").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  try {
    await archiveMateriel(parsedId.data);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
