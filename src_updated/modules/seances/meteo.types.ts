/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Weather watch for outdoor sessions (cahier §3.12).
 * Serializable enums and DTOs shared by server and client code.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { LieuRef } from "./lieu.types";

export const CRITERES_METEO = [
  "PLUIE_PROBABILITE",
  "PLUIE_MM",
  "VENT",
  "TEMPERATURE_BASSE",
  "TEMPERATURE_HAUTE",
] as const;
export type CritereMeteo = (typeof CRITERES_METEO)[number];

export const critereMeteoLabels: Record<CritereMeteo, string> = {
  PLUIE_PROBABILITE: "Rain probability",
  PLUIE_MM: "Rainfall",
  VENT: "Wind",
  TEMPERATURE_BASSE: "Low temperature",
  TEMPERATURE_HAUTE: "High temperature",
};

/** Admin-configurable thresholds: a session is flagged as soon as ONE of them is crossed. */
export type SeuilsMeteo = {
  actif: boolean;
  /** Highest acceptable rain probability, % (0–100). */
  pluieProbabiliteMax: number;
  /** Highest acceptable rainfall over the session, mm. */
  pluieMmMax: number;
  /** Highest acceptable wind speed, km/h. */
  ventKmhMax: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  /** How many days ahead sessions are checked (1–14). */
  horizonJours: number;
};

export const SEUILS_METEO_PAR_DEFAUT: SeuilsMeteo = {
  actif: true,
  pluieProbabiliteMax: 60,
  pluieMmMax: 2,
  ventKmhMax: 40,
  temperatureMinC: 5,
  temperatureMaxC: 38,
  horizonJours: 5,
};

/** Hour-by-hour forecast of one place. `heures` are UTC timestamps (ms) of each hour start. */
export type PrevisionHoraire = {
  heures: number[];
  temperatureC: (number | null)[];
  probabilitePluiePct: (number | null)[];
  pluieMm: (number | null)[];
  ventKmh: (number | null)[];
};

/** Forecast over a session window. `null` = the model gave no value for that criterion. */
export type ResumePrevision = {
  probabilitePluiePct: number | null;
  pluieMm: number | null;
  ventKmh: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
};

export type Depassement = { critere: CritereMeteo; valeur: number; seuil: number };

export const STATUTS_ALERTE_METEO = ["OUVERTE", "TRAITEE", "IGNOREE", "OBSOLETE"] as const;
export type StatutAlerteMeteo = (typeof STATUTS_ALERTE_METEO)[number];

export const statutAlerteMeteoConfig: StatusConfig<StatutAlerteMeteo> = {
  OUVERTE: { label: "Needs a decision", tone: "warning" },
  TRAITEE: { label: "Handled", tone: "success" },
  IGNOREE: { label: "Kept as planned", tone: "neutral" },
  OBSOLETE: { label: "No longer relevant", tone: "neutral" },
};

export const TYPES_DECISION_METEO = ["REPORT", "LIEU_ALTERNATIF", "MAINTENU"] as const;
export type TypeDecisionMeteo = (typeof TYPES_DECISION_METEO)[number];

export type AlerteMeteoDTO = {
  id: string;
  statut: StatutAlerteMeteo;
  seance: { id: string; titre: string; dateDebut: string; dateFin: string };
  lieu: { id: string; nom: string };
  resume: ResumePrevision;
  depassements: Depassement[];
  decision?: { type: TypeDecisionMeteo; detail: string; le: string };
  verifieLe: string;
  createdAt: string;
};

export type OptionLieuAlternatifDTO = {
  lieu: LieuRef & { coutSupplementaire: number };
  /** Forecast of the alternative, only for an outdoor one. */
  resume: ResumePrevision | null;
};

export type OptionReportDTO = {
  dateDebut: string;
  dateFin: string;
  resume: ResumePrevision;
};

/** What the admin can choose from. Computed fresh each time: nothing is applied from here. */
export type PropositionsMeteoDTO = {
  lieuxAlternatifs: OptionLieuAlternatifDTO[];
  reports: OptionReportDTO[];
  /** The forecast of the original place could not be fetched: no postponement can be proposed. */
  previsionsIndisponibles: boolean;
};

export type ResultatVerificationMeteo = {
  desactive: boolean;
  seancesVerifiees: number;
  alertesCreees: number;
  alertesMisesAJour: number;
  alertesObsoletes: number;
  /** Outdoor sessions skipped because their location has no coordinates. */
  sansCoordonnees: number;
  /** Locations whose forecast could not be fetched. */
  erreurs: number;
};

export type VerificationMeteoDTO = ResultatVerificationMeteo & { le: string };
