/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Catalogue du studio : types d'événements, packs et prestations (cahier §3.2 – §3.3).
 * Serializable enums and DTOs shared by server and client code.
 */
import type { StatusConfig } from "@/components/shared/status-badge";

/** Limits for the per-type pack cap (the cap itself is configured on each event type). */
export const PACKS_MAX_DEFAUT = 5;
export const PACKS_MAX_PLAFOND = 20;

export const STATUTS_PACK = ["BROUILLON", "PUBLIE", "DESACTIVE"] as const;
export type StatutPack = (typeof STATUTS_PACK)[number];

export const statutPackConfig: StatusConfig<StatutPack> = {
  BROUILLON: { label: "Draft", tone: "warning" },
  PUBLIE: { label: "Published", tone: "success" },
  DESACTIVE: { label: "Disabled", tone: "neutral" },
};

/** Default event types offered by the "Load defaults" button (cahier §3.2). */
export const TYPES_EVENEMENT_PAR_DEFAUT = [
  "Wedding",
  "Engagement",
  "Henna",
  "Wtiya",
  "Birthday",
  "Outdoor shooting",
  "Indoor shooting",
  "Individual portrait",
  "Family shooting",
  "Eid seasonal session",
] as const;

export type TypeEvenementDTO = {
  id: string;
  nom: string;
  slug: string;
  description?: string;
  actif: boolean;
  maxPacks: number;
  nombrePacks: number;
  createdAt: string;
  updatedAt: string;
};

export type TypeEvenementRef = Pick<TypeEvenementDTO, "id" | "nom" | "slug" | "actif">;

export type PrestationDTO = {
  id: string;
  nom: string;
  description?: string;
  /** What the quantity counts: "photos", "prints", "hours"… (optional). */
  unite?: string;
  actif: boolean;
  /** Number of packs that include this service. */
  nombrePacks: number;
};

export type PackLigneDTO = {
  prestationId: string;
  nom: string;
  unite?: string;
  quantite: number;
  conditions?: string;
};

export type PackOptionDTO = { nom: string; prix: number; description?: string };

export type PackDTO = {
  id: string;
  nom: string;
  description: string;
  prix: number;
  afficherPrix: boolean;
  /** Minutes; 0 = not specified. */
  dureeEstimeeMinutes: number;
  /** Highlighted pack (shown first on the site, used by chatbot recommendations). */
  miseEnAvant: boolean;
  statut: StatutPack;
  typeEvenement: TypeEvenementRef;
  prestations: PackLigneDTO[];
  options: PackOptionDTO[];
  createdAt: string;
  updatedAt: string;
};

/** What the showcase site and the chatbot may read: published packs of active types only. */
export type PackPublicDTO = {
  id: string;
  nom: string;
  description: string;
  /** null when the studio chose not to display the price. */
  prix: number | null;
  dureeEstimeeMinutes: number;
  /** Highlighted pack (shown first on the site, used by chatbot recommendations). */
  miseEnAvant: boolean;
  prestations: Pick<PackLigneDTO, "nom" | "unite" | "quantite" | "conditions">[];
  options: PackOptionDTO[];
};

export type CataloguePublicDTO = {
  type: Pick<TypeEvenementDTO, "id" | "nom" | "slug" | "description">;
  packs: PackPublicDTO[];
}[];

/**
 * AI (or template) suggestion of a pack name and description. Read only: the admin picks one,
 * nothing is saved until the pack form is submitted.
 */
export type LangueSuggestion = "en" | "fr" | "ar";

export type PackSuggestionDTO = {
  /** "IA" = written by the AI, "MODELE" = template fallback (AI unavailable or unusable). */
  source: "IA" | "MODELE";
  langue: LangueSuggestion;
  noms: string[];
  descriptions: string[];
};
