/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Pure rules of the locations (no database): alternatives and weekly availability.
 */
import { LIEUX_ALTERNATIFS_MAX } from "./lieu.types";

/** Tunisia has no daylight saving time: Africa/Tunis is a fixed UTC+1. */
const TUNIS_OFFSET = "+01:00";
const DAY_MS = 86_400_000;

/** Midnight (Africa/Tunis) of the day containing `date`, as a timestamp. */
export function debutJourTunis(date: Date): number {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(date);
  return new Date(`${ymd}T00:00:00${TUNIS_OFFSET}`).getTime();
}

/**
 * For each of `jours` consecutive days from `debut` (a Tunis midnight): is at least one session
 * overlapping that day? Multi-day sessions mark every day they touch.
 */
export function joursOccupes(
  seances: readonly { dateDebut: Date; dateFin: Date }[],
  debut: number,
  jours: number,
): boolean[] {
  return Array.from({ length: jours }, (_, i) => {
    const start = debut + i * DAY_MS;
    const end = start + DAY_MS;
    return seances.some((s) => s.dateDebut.getTime() < end && s.dateFin.getTime() > start);
  });
}

/** Alternatives must be distinct, other than the location itself, and not too many. */
export function verifierAlternatives(
  ids: readonly string[],
  selfId?: string,
): { ok: true } | { ok: false; message: string } {
  if (ids.length > LIEUX_ALTERNATIFS_MAX) {
    return { ok: false, message: `${LIEUX_ALTERNATIFS_MAX} alternative locations maximum.` };
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: "Each alternative location can only appear once." };
  }
  if (selfId && ids.includes(selfId)) {
    return { ok: false, message: "A location cannot be its own alternative." };
  }
  return { ok: true };
}

/** "36.85, 10.32" style input: "" = not set; otherwise a finite number inside [min, max]. */
export function lireCoordonnee(value: string, min: number, max: number): number | null | "invalid" {
  const v = value.trim().replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : "invalid";
}
