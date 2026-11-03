/**
 * Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi
 * Types from the class diagram (cahier §4.3) — Avis, Reclamation.
 * Enums marked "proposé" are not in cahier §4.4: confirm them before creating the models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const SENTIMENTS = ["POSITIF", "NEUTRE", "NEGATIF"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const STATUTS_AVIS = ["EN_ATTENTE", "PUBLIE", "REJETE"] as const;
export type StatutAvis = (typeof STATUTS_AVIS)[number];

export const STATUTS_ANALYSE_IA = ["EN_ATTENTE", "TERMINEE", "ECHOUEE"] as const;
export type StatutAnalyseIA = (typeof STATUTS_ANALYSE_IA)[number];

export const TOPICS_AVIS = [
  "QUALITE_PHOTO",
  "PONCTUALITE",
  "PRIX",
  "COMMUNICATION",
  "RETOUCHE",
  "SERVICE_CLIENT",
  "PROFESSIONNALISME",
  "LIVRAISON",
  "AUTRE",
] as const;
export type TopicAvis = (typeof TOPICS_AVIS)[number];

export const CATEGORIES_MODERATION = ["ABUS", "SPAM", "HORS_SUJET", "AUTRE"] as const;
export type CategorieModeration = (typeof CATEGORIES_MODERATION)[number];

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
  statut?: StatutAvis;
  topicsIA?: TopicAvis[];
  statutAnalyseIA?: StatutAnalyseIA;
  moderation?: {
    statut: "EN_ATTENTE" | "SIGNALE" | "APPROUVE" | "REJETE";
    categories: CategorieModeration[];
    explication?: string;
    dateAnalyse?: string;
  };
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

export type AvisListResult = {
  items: Avis[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type ReclamationListResult = {
  items: Reclamation[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export const sentimentConfig: StatusConfig<Sentiment> = {
  POSITIF: { label: "Positive", tone: "success" },
  NEUTRE: { label: "Neutral", tone: "neutral" },
  NEGATIF: { label: "Negative", tone: "danger" },
};

export const topicLabels: Record<TopicAvis, string> = {
  QUALITE_PHOTO: "Photo quality",
  PONCTUALITE: "Punctuality",
  PRIX: "Price",
  COMMUNICATION: "Communication",
  RETOUCHE: "Retouching",
  SERVICE_CLIENT: "Customer service",
  PROFESSIONNALISME: "Professionalism",
  LIVRAISON: "Delivery",
  AUTRE: "Other",
};

/** One row of the insights aggregation: reviews of a month, for one topic and sentiment. */
export type AvisInsightRow = {
  month: string; // YYYY-MM
  topic: TopicAvis | null; // null = month total, all topics
  sentiment: Sentiment;
  count: number;
};

export type AvisInsights = { months: string[]; rows: AvisInsightRow[] };

/** Moderation status of a review, as shown to its author. */
export const statutAvisConfig: StatusConfig<StatutAvis> = {
  EN_ATTENTE: { label: "Awaiting moderation", tone: "warning" },
  PUBLIE: { label: "Published", tone: "success" },
  REJETE: { label: "Not published", tone: "neutral" },
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
