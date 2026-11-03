/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Statistics (cahier §3.14). Counts come from Séances / Tâches; every amount comes from Billing.
 */
import type { StatsFacturation } from "@/modules/facturation/facturation.stats";
import type { Priorite } from "./tache.dto";

export const PERIODES_STATS = ["30j", "90j", "12m", "annee", "a-venir"] as const;
export type PeriodeStats = (typeof PERIODES_STATS)[number];

export const periodeStatsLabels: Record<PeriodeStats, string> = {
  "30j": "Last 30 days",
  "90j": "Last 90 days",
  "12m": "Last 12 months",
  annee: "This year",
  "a-venir": "Next 30 days",
};

export type PeriodeResolue = { code: PeriodeStats; label: string; from: string; to: string };

export type StatsSeances = {
  total: number;
  parType: { id: string; nom: string; total: number; terminees: number; annulees: number }[];
  parMois: { mois: string; total: number }[];
  packs: {
    top: { id: string; nom: string; total: number }[];
    sansPack: number;
    avecPack: number;
  };
  taux: {
    annulees: number;
    reportees: number;
    /** % of the sessions of the period, null when there is none. */
    tauxAnnulation: number | null;
    tauxReport: number | null;
  };
  charge: {
    employe: { id: string; nom: string };
    seances: number;
    heures: number;
    tachesOuvertes: number;
    tachesEnRetard: number;
  }[];
};

/** Tasks are shown "as of now": a late task is late whatever the period chosen. */
export type StatsTaches = {
  ouvertes: number;
  enRetard: number;
  parPriorite: Record<Priorite, number>;
  plusAnciennes: {
    id: string;
    titre: string;
    seance: { id: string; titre: string };
    employe: string | null;
    dateLimite: string;
    joursRetard: number;
    priorite: Priorite;
  }[];
};

export type StatistiquesDTO = {
  periode: PeriodeResolue;
  seances: StatsSeances;
  taches: StatsTaches;
  facturation: StatsFacturation;
};
