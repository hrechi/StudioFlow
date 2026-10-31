"use server";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import { objectIdSchema } from "./materiel.schemas";
import type { ResultatReservation } from "./materiel.types";
import { panneSchema, reservationsSchema, retourSchema } from "./reservation-materiel.schemas";
import {
  annulerReservation,
  confirmerReservation,
  createReservations,
  demarrerReservation,
  enregistrerRetour,
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
