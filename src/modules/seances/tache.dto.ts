/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Tasks attached to a séance (cahier §3.10).
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const STATUTS_TACHE = ["A_FAIRE", "EN_COURS", "TERMINEE"] as const;
export type StatutTache = (typeof STATUTS_TACHE)[number];

export const statutTacheConfig: StatusConfig<StatutTache> = {
  A_FAIRE: { label: "To do", tone: "neutral" },
  EN_COURS: { label: "In progress", tone: "info" },
  TERMINEE: { label: "Done", tone: "success" },
};

export const PRIORITES = ["BASSE", "NORMALE", "HAUTE"] as const;
export type Priorite = (typeof PRIORITES)[number];
export const prioriteConfig: StatusConfig<Priorite> = {
  BASSE: { label: "Low", tone: "neutral" },
  NORMALE: { label: "Normal", tone: "info" },
  HAUTE: { label: "High", tone: "danger" },
};

export const PHASES = ["AVANT", "PENDANT", "APRES"] as const;
export type Phase = (typeof PHASES)[number];
export const phaseLabels: Record<Phase, string> = {
  AVANT: "Before",
  PENDANT: "During",
  APRES: "After",
};

export const MODELE_TACHES: { phase: Phase; titre: string; jours: number; priorite: Priorite }[] = [
  { phase: "AVANT", titre: "Confirm the schedule and location", jours: -3, priorite: "HAUTE" },
  { phase: "AVANT", titre: "Check the team planning", jours: -3, priorite: "NORMALE" },
  { phase: "AVANT", titre: "Prepare the equipment list", jours: -2, priorite: "NORMALE" },
  { phase: "AVANT", titre: "Confirm equipment needs with the Equipment module", jours: -2, priorite: "HAUTE" },
  { phase: "PENDANT", titre: "Shoot the planned coverage", jours: 0, priorite: "HAUTE" },
  { phase: "PENDANT", titre: "Film the planned sequences", jours: 0, priorite: "NORMALE" },
  { phase: "PENDANT", titre: "Check that the key moments are covered", jours: 0, priorite: "NORMALE" },
  { phase: "APRES", titre: "Sort the photos", jours: 2, priorite: "NORMALE" },
  { phase: "APRES", titre: "Retouch the photos", jours: 7, priorite: "NORMALE" },
  { phase: "APRES", titre: "Edit the video and Reel", jours: 10, priorite: "NORMALE" },
  { phase: "APRES", titre: "Prepare the album and prints", jours: 14, priorite: "BASSE" },
  { phase: "APRES", titre: "Deliver the items included in the pack", jours: 21, priorite: "HAUTE" },
];

export type TacheDTO = {
  id: string;
  titre: string;
  description?: string;
  seance: { id: string; titre: string; dateDebut: string };
  employe: UtilisateurRef | null;
  dateLimite: string | null;
  priorite: Priorite;
  phase: Phase;
  statut: StatutTache;
  enRetard: boolean;
  createdAt: string;
};
