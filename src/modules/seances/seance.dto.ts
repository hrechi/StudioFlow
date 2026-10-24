/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Real séance record (cahier §3.7 – §3.9).
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const STATUTS_SEANCE_REEL = [
  "DEMANDE_RECUE",
  "EN_ATTENTE_CONFIRMATION",
  "CONFIRMEE",
  "EN_COURS",
  "TERMINEE",
  "REPORTEE",
  "ANNULEE",
] as const;
export type StatutSeanceReel = (typeof STATUTS_SEANCE_REEL)[number];

export const statutSeanceReelConfig: StatusConfig<StatutSeanceReel> = {
  DEMANDE_RECUE: { label: "Request received", tone: "warning" },
  EN_ATTENTE_CONFIRMATION: { label: "Awaiting confirmation", tone: "warning" },
  CONFIRMEE: { label: "Confirmed", tone: "info" },
  EN_COURS: { label: "In progress", tone: "ai" },
  TERMINEE: { label: "Completed", tone: "success" },
  REPORTEE: { label: "Postponed", tone: "neutral" },
  ANNULEE: { label: "Cancelled", tone: "danger" },
};

export const TRANSITIONS: Record<StatutSeanceReel, readonly StatutSeanceReel[]> = {
  DEMANDE_RECUE: ["EN_ATTENTE_CONFIRMATION", "CONFIRMEE", "ANNULEE"],
  EN_ATTENTE_CONFIRMATION: ["CONFIRMEE", "REPORTEE", "ANNULEE"],
  CONFIRMEE: ["EN_COURS", "REPORTEE", "ANNULEE"],
  EN_COURS: ["TERMINEE", "ANNULEE"],
  REPORTEE: ["CONFIRMEE", "ANNULEE"],
  TERMINEE: [],
  ANNULEE: [],
};

export const STATUTS_BLOQUANTS: readonly StatutSeanceReel[] = [
  "EN_ATTENTE_CONFIRMATION",
  "CONFIRMEE",
  "EN_COURS",
];
export const STATUTS_INITIAUX: readonly StatutSeanceReel[] = [
  "DEMANDE_RECUE",
  "EN_ATTENTE_CONFIRMATION",
  "CONFIRMEE",
];
export const STATUTS_SUPPRIMABLES: readonly StatutSeanceReel[] = ["DEMANDE_RECUE", "ANNULEE"];

export const ROLES_EQUIPE = [
  "PHOTOGRAPHE_PRINCIPAL",
  "SECOND_PHOTOGRAPHE",
  "VIDEASTE",
  "ASSISTANT",
  "MONTEUR",
  "RESPONSABLE_LIVRAISON",
] as const;
export type RoleEquipe = (typeof ROLES_EQUIPE)[number];

export const roleEquipeLabels: Record<RoleEquipe, string> = {
  PHOTOGRAPHE_PRINCIPAL: "Lead photographer",
  SECOND_PHOTOGRAPHE: "Second photographer",
  VIDEASTE: "Videographer",
  ASSISTANT: "Photographer assistant",
  MONTEUR: "Video editor",
  RESPONSABLE_LIVRAISON: "Preparation / delivery",
};

export type SeanceDTO = {
  id: string;
  titre: string;
  client: UtilisateurRef | null;
  clientExterne?: { nom: string; telephone: string; email?: string };
  typeEvenement: { id: string; nom: string };
  pack: { id: string; nom: string; prix: number } | null;
  prestationPersonnalisee?: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  statut: StatutSeanceReel;
  equipe: { employe: UtilisateurRef; role: RoleEquipe }[];
  notes?: string;
  messageClient?: string;
  /** Prix final convenu avec le client (peut différer du prix catalogue du pack). */
  prixFinal?: number;
  createdAt: string;
};

export type SeanceClientDTO = Omit<SeanceDTO, "notes" | "equipe">;

export const STATUTS_ANNULABLES_CLIENT: readonly StatutSeanceReel[] = [
  "DEMANDE_RECUE",
  "EN_ATTENTE_CONFIRMATION",
];

export function nomClient(s: Pick<SeanceDTO, "client" | "clientExterne">): string {
  if (s.client) return `${s.client.prenom} ${s.client.nom}`.trim();
  return s.clientExterne?.nom ?? "Unknown client";
}
