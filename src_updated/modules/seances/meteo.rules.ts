/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 *
 * Pure weather rules (no database, no network → unit-testable):
 *  - reading an Open-Meteo answer (untrusted: validated by hand, bad shapes are rejected);
 *  - summarising the forecast over a session window;
 *  - comparing it with the admin's thresholds;
 *  - finding candidate days to postpone to.
 * The AI is not involved: a forecast is a measurement, the thresholds are the admin's rules.
 */
import type {
  CritereMeteo,
  Depassement,
  PrevisionHoraire,
  ResumePrevision,
  SeuilsMeteo,
} from "./meteo.types";

const HOUR = 3_600_000;
const DAY = 86_400_000;

// ── Reading Open-Meteo ──────────────────────────────────────────────────────

function lireSerie(value: unknown, longueur: number): (number | null)[] | null {
  if (!Array.isArray(value) || value.length !== longueur) return null;
  return value.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
}

/**
 * Open-Meteo `hourly` block requested with `timezone=GMT`: times look like "2026-10-29T14:00"
 * and are UTC. Returns null when the shape is not the expected one.
 */
export function lirePrevisions(json: unknown): PrevisionHoraire | null {
  const hourly = (json as { hourly?: Record<string, unknown> } | null)?.hourly;
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) return null;
  const heures = hourly.time.map((t) =>
    typeof t === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t) ? Date.parse(`${t}:00Z`) : NaN,
  );
  if (heures.some((h) => Number.isNaN(h))) return null;
  const n = heures.length;
  const temperatureC = lireSerie(hourly.temperature_2m, n);
  const pluieMm = lireSerie(hourly.precipitation, n);
  const ventKmh = lireSerie(hourly.wind_speed_10m, n);
  // The probability is missing for some models / far days: tolerated, treated as "no value".
  const probabilitePluiePct =
    lireSerie(hourly.precipitation_probability, n) ?? Array<number | null>(n).fill(null);
  if (!temperatureC || !pluieMm || !ventKmh) return null;
  return { heures, temperatureC, probabilitePluiePct, pluieMm, ventKmh };
}

// ── Window summary ──────────────────────────────────────────────────────────

function valeurs(serie: (number | null)[], indices: number[]): number[] {
  return indices.flatMap((i) => (serie[i] == null ? [] : [serie[i] as number]));
}

/** Indices of the forecast hours that overlap [debut, fin) (timestamps in ms). */
function heuresDeLaFenetre(prev: PrevisionHoraire, debut: number, fin: number): number[] {
  return prev.heures.flatMap((h, i) => (h < fin && h + HOUR > debut ? [i] : []));
}

/** Max / sum / min over the session hours; null when no hour overlaps or no value exists. */
export function resumerFenetre(
  prev: PrevisionHoraire,
  debut: number,
  fin: number,
): ResumePrevision | null {
  const idx = heuresDeLaFenetre(prev, debut, fin);
  if (idx.length === 0) return null;
  const prob = valeurs(prev.probabilitePluiePct, idx);
  const mm = valeurs(prev.pluieMm, idx);
  const vent = valeurs(prev.ventKmh, idx);
  const temp = valeurs(prev.temperatureC, idx);
  const arrondi = (n: number) => Math.round(n * 10) / 10;
  return {
    probabilitePluiePct: prob.length ? Math.max(...prob) : null,
    pluieMm: mm.length ? arrondi(mm.reduce((a, b) => a + b, 0)) : null,
    ventKmh: vent.length ? arrondi(Math.max(...vent)) : null,
    temperatureMinC: temp.length ? arrondi(Math.min(...temp)) : null,
    temperatureMaxC: temp.length ? arrondi(Math.max(...temp)) : null,
  };
}

/** True when the forecast covers the whole window (needed to promise a postponement date). */
export function couvreFenetre(prev: PrevisionHoraire, debut: number, fin: number): boolean {
  if (prev.heures.length === 0) return false;
  const premiere = Math.min(...prev.heures);
  const derniere = Math.max(...prev.heures) + HOUR;
  return premiere <= debut && derniere >= fin;
}

// ── Thresholds ──────────────────────────────────────────────────────────────

export function evaluer(resume: ResumePrevision, seuils: SeuilsMeteo): Depassement[] {
  const out: Depassement[] = [];
  const ajoute = (critere: CritereMeteo, valeur: number | null, seuil: number, depasse: boolean) => {
    if (valeur != null && depasse) out.push({ critere, valeur, seuil });
  };
  const { probabilitePluiePct: p, pluieMm: mm, ventKmh: v, temperatureMinC: tmin, temperatureMaxC: tmax } =
    resume;
  ajoute("PLUIE_PROBABILITE", p, seuils.pluieProbabiliteMax, p != null && p > seuils.pluieProbabiliteMax);
  ajoute("PLUIE_MM", mm, seuils.pluieMmMax, mm != null && mm > seuils.pluieMmMax);
  ajoute("VENT", v, seuils.ventKmhMax, v != null && v > seuils.ventKmhMax);
  ajoute("TEMPERATURE_BASSE", tmin, seuils.temperatureMinC, tmin != null && tmin < seuils.temperatureMinC);
  ajoute("TEMPERATURE_HAUTE", tmax, seuils.temperatureMaxC, tmax != null && tmax > seuils.temperatureMaxC);
  return out;
}

const UNITES: Record<CritereMeteo, string> = {
  PLUIE_PROBABILITE: "%",
  PLUIE_MM: " mm",
  VENT: " km/h",
  TEMPERATURE_BASSE: "°C",
  TEMPERATURE_HAUTE: "°C",
};

const NOMS: Record<CritereMeteo, string> = {
  PLUIE_PROBABILITE: "Rain probability",
  PLUIE_MM: "Rainfall",
  VENT: "Wind",
  TEMPERATURE_BASSE: "Low temperature",
  TEMPERATURE_HAUTE: "High temperature",
};

/** "Rain probability 80% (limit 60%)". Temperatures: "limit" is the bound that was crossed. */
export function decrireDepassement(d: Depassement): string {
  const u = UNITES[d.critere];
  return `${NOMS[d.critere]} ${d.valeur}${u} (limit ${d.seuil}${u})`;
}

// ── Postponement candidates ─────────────────────────────────────────────────

/**
 * Same time of day, on the following days, where the forecast respects every threshold.
 * Tunisia has no daylight saving time, so "+ n × 24 h" keeps the local time of day.
 * A day is kept only if the forecast covers the whole session and gives a rainfall value
 * (no value = we cannot promise it will be dry).
 */
export function candidatsReport(input: {
  prev: PrevisionHoraire;
  seuils: SeuilsMeteo;
  debut: number;
  fin: number;
  maintenant: number;
  /** Notice the studio needs before a new date (same 24 h rule as client reservations). */
  preavisMs?: number;
  max?: number;
}): { debut: number; fin: number; resume: ResumePrevision }[] {
  const { prev, seuils, debut, fin, maintenant, preavisMs = DAY, max = 6 } = input;
  const out: { debut: number; fin: number; resume: ResumePrevision }[] = [];
  for (let n = 1; n <= 16 && out.length < max; n++) {
    const d = debut + n * DAY;
    const f = fin + n * DAY;
    if (d < maintenant + preavisMs) continue;
    if (!couvreFenetre(prev, d, f)) break; // beyond the forecast horizon
    const resume = resumerFenetre(prev, d, f);
    if (!resume || resume.pluieMm == null) continue;
    if (evaluer(resume, seuils).length === 0) out.push({ debut: d, fin: f, resume });
  }
  return out;
}
