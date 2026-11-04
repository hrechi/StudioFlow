"use server";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { revalidatePath } from "next/cache";
import {
  ServiceError,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import { objectIdSchema } from "./materiel.schemas";
import { getMaterielById } from "./materiel.service";
import { analyserPanne, type AnalysePanne } from "./panne.analyse";
import type { ResultatReservation } from "./materiel.types";
import { panneSchema, reservationsSchema, retourSchema } from "./reservation-materiel.schemas";
import {
  annulerReservation,
  appliquerTransitionGroupe,
  confirmerReservation,
  createReservations,
  demarrerReservation,
  enregistrerRetour,
  envoyerRappel,
  genererPackingList,
  signalerPanne,
} from "./reservation-materiel.service";

/**
 * ADMIN acts on every reservation; a PHOTOGRAPHE only on their own (checked in the service).
 * Both can report a breakdown. Starting a reservation (equipment handed over) is ADMIN only.
 */
const revalidate = () => {
  revalidatePath("/dashboard/materiel", "layout");
  revalidatePath("/dashboard");
};

async function runWith<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    revalidate();
    return success(data);
  } catch (error) {
    return toFailure(error);
  }
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  const result = await runWith(fn);
  return result.ok ? success() : result;
}

const reservationId = objectIdSchema("Reservation");

/** Returns one result per item: the dialog shows the refusals next to each item. */
export async function createReservationsAction(
  input: unknown,
): Promise<ActionResult<ResultatReservation[]>> {
  const user = await requireArea("materiel");
  const parsed = reservationsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runWith(() => createReservations(user, parsed.data));
}

export async function confirmerReservationAction(id: string): Promise<ActionResult> {
  const user = await requireArea("materiel");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => confirmerReservation(parsedId.data, user));
}

export async function demarrerReservationAction(id: string): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => demarrerReservation(parsedId.data, user));
}

export async function annulerReservationAction(id: string): Promise<ActionResult> {
  const user = await requireArea("materiel");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return run(() => annulerReservation(parsedId.data, user));
}

export async function enregistrerRetourAction(id: string, input: unknown): Promise<ActionResult> {
  const user = await requireArea("materiel");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = retourSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return run(() => enregistrerRetour(parsedId.data, parsed.data, user));
}

export async function signalerPanneAction(
  materielId: string,
  input: unknown,
): Promise<ActionResult<{ notifies: number }>> {
  const user = await requireArea("materiel");
  const parsedId = objectIdSchema("Equipment").safeParse(materielId);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = panneSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runWith(() => signalerPanne(parsedId.data, parsed.data, user));
}

/** Read-only AI triage. The existing breakdown action remains the only state-changing step. */
export async function analyserPanneAction(
  materielId: string,
  input: unknown,
): Promise<ActionResult<AnalysePanne>> {
  await requireArea("materiel");
  const parsedId = objectIdSchema("Equipment").safeParse(materielId);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = panneSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const materiel = await getMaterielById(parsedId.data);
    if (!materiel) throw new ServiceError("Equipment not found.");
    return success(await analyserPanne(materiel, parsed.data.description));
  } catch (error) {
    return toFailure(error);
  }
}

export async function appliquerTransitionGroupeAction(
  ids: string[],
  vers: "CONFIRMEE" | "ANNULEE" | "RETOURNEE",
  retour?: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof appliquerTransitionGroupe>>>> {
  const user = await requireArea("materiel");
  if (!Array.isArray(ids) || ids.length === 0) {
    return validationFailure(
      reservationsSchema.pick({ materielIds: true }).safeParse({ materielIds: [] }).error!,
    );
  }
  const parsed = retourSchema.safeParse(retour ?? { etat: "BON", remarque: "" });
  if (vers === "RETOURNEE" && !parsed.success) return validationFailure(parsed.error);
  return runWith(() =>
    appliquerTransitionGroupe(ids, vers, user, parsed.success ? parsed.data : undefined),
  );
}

export async function envoyerRappelAction(
  id: string,
): Promise<ActionResult<{ sent: boolean; reason?: string }>> {
  const user = await requireArea("materiel");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return runWith(() => envoyerRappel(parsedId.data, user));
}

export async function genererPackingListAction(
  id: string,
): Promise<ActionResult<{ base64: string }>> {
  const user = await requireArea("materiel");
  const parsedId = reservationId.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  return runWith(async () => ({ base64: await genererPackingList(parsedId.data, user) }));
}
