/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Pure helpers of the Statistics page (no database): periods, months, rates, bar widths.
 */
import { debutJourTunis } from "./lieu.rules";
import {
  PERIODES_STATS,
  periodeStatsLabels,
  type PeriodeResolue,
  type PeriodeStats,
  type Recommandation,
  type StatsSeances,
  type StatsTaches,
} from "./stats.types";

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

// ── Comparison with the previous period ──────────────────────────────────────

/** Same-length window right before the period; null for "a-venir" (nothing to compare with). */
export function periodePrecedente(p: PeriodeResolue): { from: Date; to: Date } | null {
  if (p.code === "a-venir") return null;
  const from = Date.parse(p.from);
  const to = Date.parse(p.to);
  return { from: new Date(from - (to - from)), to: new Date(from) };
}

/** Relative change in %, one decimal; null when there is no usable reference (previous = 0). */
export function variation(actuel: number, precedent: number | null | undefined): number | null {
  if (precedent === null || precedent === undefined || precedent <= 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 1000) / 10;
}

/** MongoDB $dayOfWeek (1 = Sunday … 7 = Saturday) → Monday-first array of 7 counts. */
export function joursLundiPremier(groupes: { _id: number; n: number }[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const g of groupes) if (g._id >= 1 && g._id <= 7) out[(g._id + 5) % 7] += g.n;
  return out;
}

// ── Insights (cahier §3.14) ──────────────────────────────────────────────────

const NIVEAU_ORDRE = { attention: 0, opportunite: 1, info: 2 } as const;

function moisCourt(mois: string): string {
  const [y, m] = mois.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/**
 * Suggestions for the manager, derived ONLY from counts already shown on the page.
 * Thresholds are explicit constants below; the manager decides what to do with them.
 */
export function genererRecommandations(input: {
  seances: StatsSeances;
  taches: StatsTaches;
  facturationEnRetard: number;
}): Recommandation[] {
  const { seances: s, taches, facturationEnRetard } = input;
  const recs: Recommandation[] = [];

  if (taches.enRetard > 0) {
    recs.push({
      id: "taches-retard",
      niveau: "attention",
      titre: `${taches.enRetard} task${taches.enRetard > 1 ? "s" : ""} past due`,
      detail: "Late preparation or delivery tasks can delay what clients receive.",
      lien: { href: "/dashboard/taches", label: "Open tasks" },
    });
  }
  if (facturationEnRetard > 0) {
    recs.push({
      id: "factures-retard",
      niveau: "attention",
      titre: `${facturationEnRetard} invoice${facturationEnRetard > 1 ? "s" : ""} past due`,
      detail: "Unpaid invoices beyond their due date (figures come from Billing).",
      lien: { href: "/dashboard/facturation/factures", label: "Open invoices" },
    });
  }
  if (s.taux.tauxAnnulation !== null && s.taux.tauxAnnulation > 15 && s.total >= 5) {
    recs.push({
      id: "annulations",
      niveau: "attention",
      titre: `Cancellation rate at ${s.taux.tauxAnnulation}%`,
      detail: `${s.taux.annulees} cancelled session${s.taux.annulees > 1 ? "s" : ""} in the period. Consider confirming bookings earlier or asking for a deposit.`,
    });
  }
  if (s.packsSansDemande.length > 0 && s.total >= 5) {
    const noms = s.packsSansDemande.slice(0, 3).map((p) => p.nom).join(", ");
    recs.push({
      id: "packs-sans-demande",
      niveau: "opportunite",
      titre: `${s.packsSansDemande.length} published pack${s.packsSansDemande.length > 1 ? "s" : ""} without any request`,
      detail: `${noms}${s.packsSansDemande.length > 3 ? "…" : ""}. Review the price, the description or how visible they are.`,
      lien: { href: "/dashboard/catalogue/packs", label: "Open packs" },
    });
  }
  if (s.parMois.length >= 3 && s.total >= 6) {
    const moyenne = s.total / s.parMois.length;
    const creux = s.parMois.filter((m) => m.total <= moyenne * 0.5).map((m) => moisCourt(m.mois));
    if (creux.length > 0 && creux.length < s.parMois.length) {
      recs.push({
        id: "periodes-creuses",
        niveau: "opportunite",
        titre: "Quieter periods",
        detail: `${creux.join(", ")} ${creux.length > 1 ? "have" : "has"} less than half of the monthly average (${Math.round(moyenne * 10) / 10} sessions). A seasonal offer could help.`,
      });
    }
  }
  const ventesPacks = s.packs.avecPack;
  const premier = s.packs.top[0];
  if (premier && ventesPacks >= 5) {
    const part = Math.round((premier.total / ventesPacks) * 100);
    if (part >= 50) {
      recs.push({
        id: "pack-dominant",
        niveau: "info",
        titre: `"${premier.nom}" leads with ${part}% of pack bookings`,
        detail: "Consider featuring it, or building a higher tier to offer as an upgrade.",
      });
    }
  }
  const heuresTotal = s.charge.reduce((a, c) => a + c.heures, 0);
  const premierEmploye = s.charge[0];
  if (s.charge.length >= 2 && heuresTotal >= 10 && premierEmploye) {
    const part = Math.round((premierEmploye.heures / heuresTotal) * 100);
    if (part >= 60) {
      recs.push({
        id: "charge-desequilibree",
        niveau: "info",
        titre: `${premierEmploye.employe.nom} carries ${part}% of the team's hours`,
        detail: "Consider spreading the next assignments to keep the workload balanced.",
      });
    }
  }
  return recs
    .sort((a, b) => NIVEAU_ORDRE[a.niveau] - NIVEAU_ORDRE[b.niveau])
    .slice(0, 5);
}
