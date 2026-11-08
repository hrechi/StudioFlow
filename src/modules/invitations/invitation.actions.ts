"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import {
  assertDebloque,
  demanderDeblocage,
  setParametresInvitation,
} from "./invitation.acces";
import { rediger, suggererPalette, type ResultatIA } from "./invitation.ia";
import {
  createInvitationSchema,
  paletteSchema,
  prixInvitationSchema,
  redactionSchema,
  saveInvitationSchema,
  type Palette,
} from "./invitation.schema";
import {
  createInvitation,
  deleteInvitation,
  duplicateInvitation,
  saveInvitation,
  setPartage,
} from "./invitation.service";
import { CLIENT_PATH } from "./invitation.types";

function revalidateAcces() {
  revalidatePath(CLIENT_PATH);
  revalidatePath("/espace-client/factures");
  revalidatePath("/dashboard/facturation/devis");
  revalidatePath("/dashboard/facturation/invitations");
}

/** Client: opens the quote for the editor, then accepts and pays it like a session quote. */
export async function demanderDeblocageAction(): Promise<ActionResult<{ devisId: string }>> {
  const actor = await requireRole("CLIENT");
  try {
    const result = await demanderDeblocage(actor);
    revalidateAcces();
    return success(result);
  } catch (error) { return toFailure(error); }
}

export async function createInvitationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("CLIENT");
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await createInvitation(parsed.data, actor);
    revalidatePath(CLIENT_PATH);
    return success(result);
  } catch (error) { return toFailure(error); }
}

export async function saveInvitationAction(id: string, input: unknown): Promise<ActionResult<{ updatedAt: string }>> {
  const actor = await requireRole("CLIENT");
  const parsed = saveInvitationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    // No revalidation: this runs on every autosave and the list reloads when the client opens it.
    return success(await saveInvitation(id, parsed.data, actor));
  } catch (error) { return toFailure(error); }
}

export async function duplicateInvitationAction(id: string): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("CLIENT");
  try {
    const result = await duplicateInvitation(id, actor);
    revalidatePath(CLIENT_PATH);
    return success(result);
  } catch (error) { return toFailure(error); }
}

export async function deleteInvitationAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("CLIENT");
  try {
    await deleteInvitation(id, actor);
    revalidatePath(CLIENT_PATH);
    return success();
  } catch (error) { return toFailure(error); }
}

export async function setPartageAction(id: string, actif: boolean): Promise<ActionResult<{ token?: string; actif: boolean }>> {
  const actor = await requireRole("CLIENT");
  try {
    const result = await setPartage(id, actif === true, actor);
    revalidatePath(CLIENT_PATH);
    return success(result);
  } catch (error) { return toFailure(error); }
}

export async function redigerAction(input: unknown): Promise<ActionResult<ResultatIA<string>>> {
  const actor = await requireRole("CLIENT");
  const parsed = redactionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await assertDebloque(actor);
    return success(await rediger(parsed.data));
  } catch (error) { return toFailure(error); }
}

export async function suggererPaletteAction(input: unknown): Promise<ActionResult<ResultatIA<Palette>>> {
  const actor = await requireRole("CLIENT");
  const parsed = paletteSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await assertDebloque(actor);
    return success(await suggererPalette(parsed.data.ambiance, parsed.data.typeEvenement));
  } catch (error) { return toFailure(error); }
}

export async function setPrixInvitationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = prixInvitationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await setParametresInvitation(parsed.data, actor);
    revalidateAcces();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
