/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Pure helpers of the Statistics page (no database): periods, months, rates, bar widths.
 */
import { debutJourTunis } from "./lieu.rules";
import { PERIODES_STATS, periodeStatsLabels, type PeriodeResolue, type PeriodeStats } from "./stats.types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
export const PERIODE_PAR_DEFAUT: PeriodeStats = "90j";

export function lirePeriode(raw: string | string[] | undefined): PeriodeStats {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (PERIODES_STATS as readonly string[]).includes(v ?? "") ? (v as PeriodeStats) : PERIODE_PAR_DEFAUT;
}

/** Tunis midnight of the 1st of the month `decalage` months from the month of `ref`. */
function debutMoisTunis(ref: Date, decalage: number): number {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" })
    .format(ref)
    .split("-")
    .map(Number);
  // Date.UTC normalises overflowing months; Tunis is UTC+1 all year, so midnight = UTC − 1 h.
  return Date.UTC(y, m - 1 + decalage, 1) - HOUR;
}

/** [from, to) in Africa/Tunis days. Past periods end at the end of today; "a-venir" starts today. */
export function resoudrePeriode(code: PeriodeStats, now: Date = new Date()): PeriodeResolue {
  const aujourdhui = debutJourTunis(now);
  let from: number;
  let to = aujourdhui + DAY;
  switch (code) {
    case "30j":
      from = aujourdhui - 29 * DAY;
      break;
    case "90j":
      from = aujourdhui - 89 * DAY;
      break;
    case "12m":
      from = debutMoisTunis(now, -11);
      break;
    case "annee": {
      const annee = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric" }).format(now);
      from = Date.UTC(Number(annee), 0, 1) - HOUR;
      break;
    }
    case "a-venir":
      from = aujourdhui;
      to = aujourdhui + 30 * DAY;
      break;
  }
  return {
    code,
    label: periodeStatsLabels[code],
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  };
}

/** "YYYY-MM" (Tunis) of every month the period touches, in order. */
export function listeMois(from: Date, to: Date): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit" });
  for (let i = 0; i < 40; i++) {
    const debut = debutMoisTunis(from, i);
    if (debut >= to.getTime()) break;
    const [y, m] = fmt.format(new Date(debut + HOUR)).split("-");
    out.push(`${y}-${m}`);
  }
  return out;
}

/** Percentage with one decimal; null when there is nothing to divide by. */
export function taux(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}

/** Bar width in %, never invisible for a non-zero value. */
export function largeurBarre(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

/** Hours between two dates, one decimal. */
export function heuresEntre(debut: Date, fin: Date): number {
  return Math.round(((fin.getTime() - debut.getTime()) / HOUR) * 10) / 10;
}
