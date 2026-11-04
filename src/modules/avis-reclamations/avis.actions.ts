"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  deleteOwnAvis,
  getAvisReplyContext,
  moderateAvis,
  retryAvisAnalysis,
  saveAvisReply,
  updateOwnAvis,
} from "./avis.service";
import {
  createAvisSchema,
  createReclamationSchema,
  feedbackIdSchema,
  generateReplySchema,
  moderateAvisSchema,
  repondreAvisSchema,
  rateResolutionSchema,
  reopenReclamationSchema,
  sendReclamationMessageSchema,
  updateOwnAvisSchema,
  updateOwnReclamationSchema,
  updateReclamationSchema,
} from "./avis.schemas";
import { generateReply } from "./ai.service";
import {
  addReclamationMessage,
  analyzeClientMessageInThread,
  createReclamation,
  deleteOwnReclamation,
  rateReclamationResolution,
  reopenReclamation,
  summarizeReclamation,
  updateOwnReclamation,
  updateReclamation,
} from "./reclamation.service";
import type { ReclamationMessage, ResumeReclamation } from "./avis.types";
import { getReclamationReplyContext } from "./reclamation.service";

const AVIS_PATH = "/dashboard/avis";
const RECLAMATIONS_PATH = "/dashboard/reclamations";
const CLIENT_PATH = "/espace-client/avis";

/** Pages that show reviews (client area, admin board, public website). */
function revalidateReviews() {
  revalidatePath(CLIENT_PATH);
  revalidatePath(AVIS_PATH);
  revalidatePath("/", "page");
}

/** Lists and every conversation page under them. */
function revalidateComplaints() {
  revalidatePath(CLIENT_PATH, "layout");
  revalidatePath(RECLAMATIONS_PATH, "layout");
}

// ── The author's own reviews and complaints (edit / delete) ─────────────────

export async function updateMyAvisAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = updateOwnAvisSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateOwnAvis(user.id, parsed.data);
    revalidateReviews();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteMyAvisAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = feedbackIdSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await deleteOwnAvis(user.id, parsed.data.id);
    revalidateReviews();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateMyReclamationAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = updateOwnReclamationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateOwnReclamation(user.id, parsed.data);
    revalidateComplaints();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteMyReclamationAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT", "PHOTOGRAPHE");
  const parsed = feedbackIdSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await deleteOwnReclamation(user.id, parsed.data.id);
    revalidateComplaints();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

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
    revalidateComplaints();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function sendReclamationMessageAction(
  input: unknown,
): Promise<ActionResult<ReclamationMessage>> {
  const user = await requireRole("CLIENT", "ADMIN", "PHOTOGRAPHE");
  const parsed = sendReclamationMessageSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const message = await addReclamationMessage(
      parsed.data.id,
      { id: user.id, role: user.role },
      parsed.data.contenu,
    );
    revalidateComplaints();
    // Sentiment / escalation is AI work: it must not delay the client's send.
    if (user.role === "CLIENT") {
      // The staff board is rendered per request, so the result shows on its next load.
      after(() => analyzeClientMessageInThread(parsed.data.id, message.id));
    }
    return success(message);
  } catch (error) {
    return toFailure(error);
  }
}

export async function rateResolutionAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT");
  const parsed = rateResolutionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await rateReclamationResolution(user.id, parsed.data.id, parsed.data.satisfait);
    revalidateComplaints();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function reopenReclamationAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT");
  const parsed = reopenReclamationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await reopenReclamation(user.id, parsed.data.id, parsed.data.raison);
    revalidateComplaints();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function summarizeReclamationAction(
  input: unknown,
): Promise<ActionResult<ResumeReclamation>> {
  await requireRole("ADMIN", "PHOTOGRAPHE");
  const parsed = feedbackIdSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await summarizeReclamation(parsed.data.id));
  } catch (error) {
    return error instanceof Error && error.name === "AIConfigurationError"
      ? failure("AI summaries are not configured.")
      : toFailure(error);
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
