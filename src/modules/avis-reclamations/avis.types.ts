/**
 * Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi
 * Types from the class diagram (cahier §4.3) — Avis, Reclamation.
 * Enums marked "proposé" are not in cahier §4.4: confirm them before creating the models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const SENTIMENTS = ["POSITIF", "NEUTRE", "NEGATIF"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const STATUTS_RECLAMATION = ["OUVERTE", "EN_COURS", "RESOLUE", "REJETEE"] as const;
export type StatutReclamation = (typeof STATUTS_RECLAMATION)[number];

export const CATEGORIES_RECLAMATION = ["RETARD", "QUALITE", "FACTURATION", "AUTRE"] as const;
export type CategorieReclamation = (typeof CATEGORIES_RECLAMATION)[number];

/** Proposé. */
export const PRIORITES = ["BASSE", "MOYENNE", "HAUTE", "URGENTE"] as const;
export type Priorite = (typeof PRIORITES)[number];

/** Collection `avis` (one per completed séance). */
export type Avis = {
  id: string;
  note: number; // 1–5
  commentaire: string;
  dateAvis: string;
  sentimentIA: Sentiment;
  scoreSentimentIA: number; // 0–1
  estPublie: boolean;
  reponseStudio?: string;
  client: UtilisateurRef;
  seance: { id: string; titre: string; type: string };
};

/** Collection `reclamations`. */
export type Reclamation = {
  id: string;
  objet: string;
  description: string;
  categorie: CategorieReclamation; // chosen by the client
  categorieIA: CategorieReclamation; // AI classification
  priorite: Priorite; // AI prioritization
  statut: StatutReclamation;
  reponse?: string;
  dateCreation: string;
  dateResolution?: string;
  client: UtilisateurRef;
  seance: { id: string; titre: string };
  traitePar?: UtilisateurRef;
};

export const sentimentConfig: StatusConfig<Sentiment> = {
  POSITIF: { label: "Positive", tone: "success" },
  NEUTRE: { label: "Neutral", tone: "neutral" },
  NEGATIF: { label: "Negative", tone: "danger" },
};

export const statutReclamationConfig: StatusConfig<StatutReclamation> = {
  OUVERTE: { label: "Open", tone: "warning" },
  EN_COURS: { label: "In progress", tone: "info" },
  RESOLUE: { label: "Resolved", tone: "success" },
  REJETEE: { label: "Rejected", tone: "neutral" },
};

export const prioriteConfig: StatusConfig<Priorite> = {
  BASSE: { label: "Low", tone: "neutral" },
  MOYENNE: { label: "Medium", tone: "info" },
  HAUTE: { label: "High", tone: "warning" },
  URGENTE: { label: "Urgent", tone: "danger" },
};

export const categorieReclamationLabels: Record<CategorieReclamation, string> = {
  RETARD: "Delay",
  QUALITE: "Quality",
  FACTURATION: "Billing",
  AUTRE: "Other",
};
