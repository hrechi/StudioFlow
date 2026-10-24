"use server";

import { revalidatePath } from "next/cache";
import {
  failure,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/guards";
import {
  createAvis,
  getAvisReplyContext,
  moderateAvis,
  retryAvisAnalysis,
  saveAvisReply,
} from "./avis.service";
import {
  createAvisSchema,
  createReclamationSchema,
  generateReplySchema,
  moderateAvisSchema,
  repondreAvisSchema,
  updateReclamationSchema,
} from "./avis.schemas";
import { generateReply } from "./ai.service";
import { createReclamation, updateReclamation } from "./reclamation.service";
import { getReclamationReplyContext } from "./reclamation.service";

const AVIS_PATH = "/dashboard/avis";
const RECLAMATIONS_PATH = "/dashboard/reclamations";

export async function createAvisAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = createAvisSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createAvis(user.id, parsed.data);
    revalidatePath("/espace-client/avis");
    revalidatePath("/", "page");
    return success({ id: created.id });
  } catch (error) {
    return toFailure(error);
  }
}

export async function createReclamationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = createReclamationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createReclamation(user.id, parsed.data);
    revalidatePath("/espace-client/avis");
    revalidatePath(RECLAMATIONS_PATH);
    return success({ id: created.id });
  } catch (error) {
    return toFailure(error);
  }
}

export async function moderateAvisAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = moderateAvisSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await moderateAvis(parsed.data.id, parsed.data.statut, admin.id);
    revalidatePath(AVIS_PATH);
    revalidatePath("/", "page");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function saveAvisReplyAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = repondreAvisSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await saveAvisReply(parsed.data.id, parsed.data.reponse, admin.id);
    revalidatePath(AVIS_PATH);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateReclamationAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = updateReclamationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateReclamation(parsed.data.id, parsed.data.statut, parsed.data.reponse, admin.id);
    revalidatePath(RECLAMATIONS_PATH);
    revalidatePath("/espace-client/avis");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function retryAvisAnalysisAction(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  try {
    await retryAvisAnalysis(id);
    revalidatePath(AVIS_PATH);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function generateFeedbackReplyAction(
  input: unknown,
): Promise<ActionResult<{ draft: string }>> {
  const user = await requireRole("ADMIN");
  const parsed = generateReplySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  void user;
  try {
    const context =
      parsed.data.kind === "avis"
        ? await getAvisReplyContext(parsed.data.id)
        : await getReclamationReplyContext(parsed.data.id);
    const draft = await generateReply(parsed.data.kind, context);
    return success({ draft: draft.draft });
  } catch (error) {
    return error instanceof Error && error.name === "AIConfigurationError"
      ? failure("AI replies are not configured.")
      : toFailure(error);
  }
}

export async function whoAmIForFeedback(): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  return success({ id: user.id });
}
