"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import {
  alerteIdSchema,
  lieuAlternatifMeteoSchema,
  reportMeteoSchema,
  seuilsMeteoSchema,
} from "./meteo.schemas";
import {
  appliquerLieuAlternatif,
  appliquerReport,
  maintenirSeance,
  proposerOptions,
  saveSeuils,
  verifierMeteo,
} from "./meteo.service";
import type { PropositionsMeteoDTO, ResultatVerificationMeteo } from "./meteo.types";

/**
 * Server Actions of the weather watch. ADMIN only. The only actions that change a session
 * (postpone / change location) are the two the admin clicks after choosing a proposal.
 */

function revalidate() {
  revalidatePath("/dashboard/meteo");
  revalidatePath("/dashboard/seances", "layout");
  revalidatePath("/dashboard/planning");
}

export async function saveSeuilsMeteoAction(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = seuilsMeteoSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await saveSeuils(parsed.data);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function verifierMeteoAction(): Promise<ActionResult<ResultatVerificationMeteo>> {
  await requireRole("ADMIN");
  try {
    const resultat = await verifierMeteo();
    revalidate();
    return success(resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function proposerOptionsMeteoAction(alerteId: string): Promise<ActionResult<PropositionsMeteoDTO>> {
  await requireRole("ADMIN");
  const parsed = alerteIdSchema.safeParse(alerteId);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    return success(await proposerOptions(parsed.data));
  } catch (error) {
    return toFailure(error);
  }
}

export async function appliquerReportMeteoAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = reportMeteoSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await appliquerReport(parsed.data.alerteId, parsed.data.dateDebut, admin.id);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function appliquerLieuAlternatifMeteoAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = lieuAlternatifMeteoSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await appliquerLieuAlternatif(parsed.data.alerteId, parsed.data.lieuId, admin.id);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function maintenirSeanceMeteoAction(alerteId: string): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = alerteIdSchema.safeParse(alerteId);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await maintenirSeance(parsed.data, admin.id);
    revalidate();
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
