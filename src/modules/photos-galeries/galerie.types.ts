/**
 * Module : Gestion des Photos & Galeries · Responsable : Louay Herichi
 * Types from the class diagram (cahier §4.3) — Photo, Galerie.
 * Fields marked "proposé" are not in the diagram: confirm them before creating the models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const STATUTS_GALERIE = ["EN_TRI", "PARTAGEE", "VALIDEE", "LIVREE"] as const;
export type StatutGalerie = (typeof STATUTS_GALERIE)[number];

export const STATUTS_CULLING = ["RETENUE", "REJETEE", "EN_ATTENTE"] as const;
export type StatutCulling = (typeof STATUTS_CULLING)[number];

/** Collection `photos` (thousands per gallery: not embedded). */
export type Photo = {
  id: string;
  galerieId: string;
  nomFichier: string;
  url: string;
  urlMiniature: string;
  format: string;
  taille: number; // bytes
  datePrise: string;
  scoreQualite: number; // 0–100 (AI)
  estFloue: boolean; // AI
  yeuxFermes?: boolean; // proposé (AI culling: closed eyes)
  groupeDoublon?: string; // proposé (AI duplicate group id)
  tagsIA: string[];
  statutCulling: StatutCulling;
  estFavori: boolean;
  estSelectionnee?: boolean; // proposé (client final selection ≠ favorite)
  commentaireClient?: string;
  ordreHistoire?: number;
  styleApplique?: string;
  urlRetouchee?: string;
  dateUpload: string;
};

/** Collection `galeries`. */
export type Galerie = {
  id: string;
  titre: string;
  categorie: string;
  photoCouverture: string;
  lienAcces: string;
  motDePasse?: string;
  dateExpiration: string;
  telechargementAutorise: boolean;
  statut: StatutGalerie;
  dateCreation: string;
  seance: { id: string; titre: string };
  client: UtilisateurRef;
  nombrePhotos: number; // UI summary
  nombreSelection: number; // UI summary
};

/** Natural-language search result (cahier: rechercherSimilaires / AI search). */
export type ResultatRechercheIA = {
  photo: Photo;
  pertinence: number; // 0–1
};

export const statutGalerieConfig: StatusConfig<StatutGalerie> = {
  EN_TRI: { label: "Culling", tone: "warning" },
  PARTAGEE: { label: "Shared", tone: "info" },
  VALIDEE: { label: "Approved", tone: "success" },
  LIVREE: { label: "Delivered", tone: "dark" },
};

export const statutCullingConfig: StatusConfig<StatutCulling> = {
  RETENUE: { label: "Kept", tone: "success" },
  REJETEE: { label: "Rejected", tone: "danger" },
  EN_ATTENTE: { label: "Pending", tone: "neutral" },
};

/** Gallery lifecycle, in order (EN_TRI → PARTAGEE → VALIDEE → LIVREE). */
export const GALERIE_PIPELINE = STATUTS_GALERIE;
