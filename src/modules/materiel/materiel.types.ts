/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * Types from the class diagram (cahier §4.3) — Materiel, Reservation.
 * Enums marked "proposé" are not in cahier §4.4: confirm them before creating the models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

/** Proposé (cahier §2.1: cameras, lenses, lighting, tripods). */
export const CATEGORIES_MATERIEL = [
  "APPAREIL_PHOTO",
  "OBJECTIF",
  "ECLAIRAGE",
  "TREPIED",
  "ACCESSOIRE",
] as const;
export type CategorieMateriel = (typeof CATEGORIES_MATERIEL)[number];

/** Proposé. */
export const ETATS_MATERIEL = ["NEUF", "BON", "USE", "EN_PANNE"] as const;
export type EtatMateriel = (typeof ETATS_MATERIEL)[number];

/** Proposé. */
export const STATUTS_RESERVATION = [
  "EN_ATTENTE",
  "CONFIRMEE",
  "EN_COURS",
  "RETOURNEE",
  "ANNULEE",
] as const;
export type StatutReservation = (typeof STATUTS_RESERVATION)[number];

/** Collection `materiels`. */
export type Materiel = {
  id: string;
  nom: string;
  categorie: CategorieMateriel;
  marque: string;
  modele: string;
  numeroSerie: string;
  etat: EtatMateriel;
  dateAchat: string;
  prix: number;
  /** Manual flag: false = kept out of reservations (lent, maintenance…). Forced to false when EN_PANNE. */
  disponible: boolean;
  photo?: string;
  /** Archived equipment is hidden from the inventory and cannot be reserved. */
  archive: boolean;
};

export type MaterielStats = { total: number; disponibles: number; enPanne: number };

/** Collection `reservations_materiel` (searched by date to detect conflicts). */
export type Reservation = {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutReservation;
  remarqueRetour?: string;
  materiel: Pick<Materiel, "id" | "nom" | "categorie">;
  seance: { id: string; titre: string; typeEvenement: string };
  /** Who made the reservation (null if the account was deleted). */
  utilisateur: UtilisateurRef | null;
};

/** Outcome of one item in a multi-item reservation (the "kit"). */
export type ResultatReservation = { materielId: string; materielNom: string } & (
  { ok: true; reservationId: string } | { ok: false; error: string }
);

/**
 * Suggested kit for a séance (cahier §2.1), see kit.analyse.ts. `source` says who chose the
 * items: the AI ("IA", with its confidence) or the fallback on past reservations ("HISTORIQUE").
 */
export type KitSuggereDTO = {
  source: "IA" | "HISTORIQUE";
  confiance?: number;
  seance: { id: string; titre: string; typeEvenement: string; dateDebut: string; dateFin: string };
  items: { materielId: string; nom: string; categorie: CategorieMateriel; raison: string }[];
};

export const categorieMaterielLabels: Record<CategorieMateriel, string> = {
  APPAREIL_PHOTO: "Camera",
  OBJECTIF: "Lens",
  ECLAIRAGE: "Lighting",
  TREPIED: "Tripod",
  ACCESSOIRE: "Accessory",
};

export const etatMaterielConfig: StatusConfig<EtatMateriel> = {
  NEUF: { label: "New", tone: "success" },
  BON: { label: "Good", tone: "info" },
  USE: { label: "Worn", tone: "warning" },
  EN_PANNE: { label: "Out of order", tone: "danger" },
};

export const statutReservationConfig: StatusConfig<StatutReservation> = {
  EN_ATTENTE: { label: "Pending", tone: "warning" },
  CONFIRMEE: { label: "Confirmed", tone: "info" },
  EN_COURS: { label: "In use", tone: "success" },
  RETOURNEE: { label: "Returned", tone: "neutral" },
  ANNULEE: { label: "Cancelled", tone: "danger" },
};
