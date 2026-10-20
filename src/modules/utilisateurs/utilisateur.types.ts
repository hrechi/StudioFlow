/**
 * Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe
 * Enumerations and serializable DTOs shared by server and client code.
 */
import type { StatusConfig } from "@/components/shared/status-badge";

export const ROLES = ["ADMIN", "PHOTOGRAPHE", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["ADMIN", "PHOTOGRAPHE"] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const TYPES_CLIENT = ["PARTICULIER", "ENTREPRISE"] as const;
export type TypeClient = (typeof TYPES_CLIENT)[number];

export const STATUTS_COMPTE = ["ACTIF", "BLOQUE"] as const;
export type StatutCompte = (typeof STATUTS_COMPTE)[number];

export const TYPES_NOTIFICATION = [
  "SYSTEME",
  "COMPTE",
  "SEANCE",
  "GALERIE",
  "FACTURATION",
  "RECLAMATION",
] as const;
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

/** Utilisateur as sent to the UI (never contains the password hash). */
export type UtilisateurDTO = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  photoProfil?: string;
  role: Role;
  typeClient?: TypeClient;
  entreprise?: string;
  specialite?: string;
  statut: StatutCompte;
  derniereConnexion?: string;
  createdAt: string;
  updatedAt: string;
};

/** Minimal reference used by other modules (client, photographe, auteur...). */
export type UtilisateurRef = Pick<UtilisateurDTO, "id" | "nom" | "prenom" | "photoProfil">;

export type NotificationDTO = {
  id: string;
  titre: string;
  message: string;
  type: TypeNotification;
  estLue: boolean;
  lienCible?: string;
  createdAt: string;
};

export const roleConfig: StatusConfig<Role> = {
  ADMIN: { label: "Administrator", tone: "dark" },
  PHOTOGRAPHE: { label: "Photographer", tone: "info" },
  CLIENT: { label: "Client", tone: "neutral" },
};

export const statutCompteConfig: StatusConfig<StatutCompte> = {
  ACTIF: { label: "Active", tone: "success" },
  BLOQUE: { label: "Blocked", tone: "danger" },
};

export const typeClientLabels: Record<TypeClient, string> = {
  PARTICULIER: "Individual",
  ENTREPRISE: "Business",
};
