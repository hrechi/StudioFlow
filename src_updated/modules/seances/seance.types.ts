/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * TEMPORARY (step 1): types of the séance TEMPLATE pages (dashboard, lieux, espace-client).
 * They were imported by existing pages but missing from the archive. They will be replaced
 * by the real Seance / Lieu models in step 3 (séances CRUD) — see mock-data.ts.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { TYPES_LIEU, typeLieuLabels, type TypeLieu } from "./lieu.types";

// The real location model lives in lieu.types.ts; re-exported for the template pages.
export { TYPES_LIEU, typeLieuLabels, type TypeLieu };

export const TYPES_SEANCE = ["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"] as const;
export type TypeSeance = (typeof TYPES_SEANCE)[number];

export const STATUTS_SEANCE = ["PLANIFIEE", "CONFIRMEE", "EN_COURS", "TERMINEE", "ANNULEE"] as const;
export type StatutSeance = (typeof STATUTS_SEANCE)[number];

export type Lieu = {
  id: string;
  nom: string;
  adresse: string;
  description: string;
  type: TypeLieu;
  capacite: number;
  disponible: boolean;
  photo: string;
};

export type Seance = {
  id: string;
  titre: string;
  type: TypeSeance;
  statut: StatutSeance;
  dateDebut: string;
  dateFin: string;
  lieu: Lieu;
  client: UtilisateurRef;
  photographe: UtilisateurRef;
  couverture: string;
};

export const statutSeanceConfig: StatusConfig<StatutSeance> = {
  PLANIFIEE: { label: "Requested", tone: "warning" },
  CONFIRMEE: { label: "Confirmed", tone: "info" },
  EN_COURS: { label: "In progress", tone: "ai" },
  TERMINEE: { label: "Completed", tone: "success" },
  ANNULEE: { label: "Cancelled", tone: "danger" },
};

export const typeSeanceLabels: Record<TypeSeance, string> = {
  MARIAGE: "Wedding",
  PORTRAIT: "Portrait",
  PRODUIT: "Product",
  EVENEMENT: "Event",
};
