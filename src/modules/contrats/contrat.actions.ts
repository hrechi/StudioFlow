"use server";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Server Actions — même pattern que facturation.actions.ts.
 */
import { revalidatePath } from "next/cache";
import { failure, success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import {
  contratIdSchema,
  creerContratSchema,
  reponsClientSchema,
  revoquerContratSchema,
} from "./contrat.schemas";
import {
  creerContrat,
  envoyerContrat,
  figerEtAncrer,
  getContrat,
  relancerAncrage,
  repondreContrat,
  revoquerContrat,
  supprimerContrat,
  NotFoundError,
} from "./contrat.service";

const ADMIN_PATH = "/dashboard/contrats";
const CLIENT_PATH = "/espace-client/contrats";

function revalidateContrats(id?: string) {
  revalidatePath(ADMIN_PATH);
  revalidatePath(CLIENT_PATH);
  if (id) {
    revalidatePath(`${ADMIN_PATH}/${id}`);
    revalidatePath(`${CLIENT_PATH}/${id}`);
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function creerContratAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const parsed = creerContratSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await creerContrat(
      {
        modeCreation: parsed.data.modeCreation,
        titre: parsed.data.titre,
        clientId: parsed.data.clientId,
        texteLibre: "texteLibre" in parsed.data ? parsed.data.texteLibre : undefined,
        champs: "champs" in parsed.data ? (parsed.data.champs as Record<string, unknown>) : undefined,
      },
      actor,
    );
    revalidateContrats(result.id);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/** Mode UPLOAD : receives FormData with a PDF file. */
export async function creerContratUploadAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN");
  const titre = formData.get("titre");
  const clientId = formData.get("clientId");
  const file = formData.get("fichier");

  if (typeof titre !== "string" || !titre.trim())
    return failure("Title is required.");
  if (typeof clientId !== "string" || !clientId.trim())
    return failure("Client is required.");
  if (!(file instanceof File) || file.size === 0)
    return failure("PDF file is required.");
  if (file.type !== "application/pdf")
    return failure("Only PDF files are accepted.");
  if (file.size > 10 * 1024 * 1024)
    return failure("File must be under 10 MB.");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await creerContrat(
      { modeCreation: "UPLOAD", titre: titre.trim(), clientId, fichierPdf: buffer },
      actor,
    );
    revalidateContrats(result.id);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function envoyerContratAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = contratIdSchema.safeParse(id);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await envoyerContrat(id, actor);
    revalidateContrats(id);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function relancerAncrageAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = contratIdSchema.safeParse(id);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await relancerAncrage(id, actor);
    revalidateContrats(id);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function revoquerContratAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = revoquerContratSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await revoquerContrat(id, parsed.data.raison, actor);
    revalidateContrats(id);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function supprimerContratAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  try {
    await supprimerContrat(id, actor);
    revalidateContrats();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

// ── Client ────────────────────────────────────────────────────────────────────

export async function repondreContratAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireRole("CLIENT");
  const parsed = reponsClientSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await repondreContrat(
      id,
      {
        accepter: parsed.data.accepter,
        motifRefus: parsed.data.motifRefus,
        clientWallet: parsed.data.clientWallet,
      },
      actor,
    );
    revalidateContrats(id);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** Expose contract data for the client portal (read-only). */
export async function getContratClientAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getContrat>>>> {
  const actor = await requireRole("CLIENT");
  try {
    const contrat = await getContrat(id, actor);
    return success(contrat);
  } catch (error) {
    if (error instanceof NotFoundError) return failure("Contract not found.");
    return toFailure(error);
  }
}
