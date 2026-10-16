/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Types from the class diagram (cahier §4.3) — Seance, Lieu.
 * Enums marked "proposé" are not in cahier §4.4: confirm them before creating the Mongoose models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const STATUTS_SEANCE = ["PLANIFIEE", "CONFIRMEE", "TERMINEE", "ANNULEE"] as const;
export type StatutSeance = (typeof STATUTS_SEANCE)[number];

/** Proposé (cahier §2.1: wedding, portrait, product, event). */
export const TYPES_SEANCE = ["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"] as const;
export type TypeSeance = (typeof TYPES_SEANCE)[number];

/** Proposé (cahier §2.1: studio room, outdoor, client's place). */
export const TYPES_LIEU = ["STUDIO", "EXTERIEUR", "DOMICILE_CLIENT"] as const;
export type TypeLieu = (typeof TYPES_LIEU)[number];

/** Collection `lieux`. */
export type Lieu = {
  id: string;
  nom: string;
  type: TypeLieu;
  adresse: string;
  capacite: number;
  description: string;
  disponible: boolean;
  photo: string; // UI only (not in the class diagram)
};

/** Collection `seances` — references the client, the photographe and the lieu. */
export type Seance = {
  id: string;
  titre: string;
  type: TypeSeance;
  dateDebut: string; // ISO
  dateFin: string; // ISO
  statut: StatutSeance;
  notes?: string;
  creneauSuggereIA?: string; // ISO
  client: UtilisateurRef;
  photographe: UtilisateurRef;
  lieu: Pick<Lieu, "id" | "nom" | "type">;
  couverture: string; // UI only: cover photo
};

/** AI time-slot suggestion (cahier: suggererCreneauIA). */
export type CreneauSuggere = {
  debut: string;
  fin: string;
  photographe: UtilisateurRef;
  lieu: Pick<Lieu, "id" | "nom">;
  score: number; // 0–1
  raison: string;
};

export const statutSeanceConfig: StatusConfig<StatutSeance> = {
  PLANIFIEE: { label: "Planned", tone: "info" },
  CONFIRMEE: { label: "Confirmed", tone: "success" },
  TERMINEE: { label: "Completed", tone: "neutral" },
  ANNULEE: { label: "Cancelled", tone: "danger" },
};

export const typeSeanceLabels: Record<TypeSeance, string> = {
  MARIAGE: "Wedding",
  PORTRAIT: "Portrait",
  PRODUIT: "Product",
  EVENEMENT: "Event",
};

export const typeLieuLabels: Record<TypeLieu, string> = {
  STUDIO: "Studio",
  EXTERIEUR: "Outdoor",
  DOMICILE_CLIENT: "At the client's place",
};
