/**
 * Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim
 * Types from the class diagram (cahier §4.3) — Portfolio, ElementPortfolio (embedded, §4.4).
 */
import type { StatusConfig } from "@/components/shared/status-badge";

export const CATEGORIES_PORTFOLIO = ["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"] as const;
export type CategoriePortfolio = (typeof CATEGORIES_PORTFOLIO)[number];

export const TYPES_BLOC = [
  "HERO",
  "A_PROPOS",
  "GALERIE",
  "COLLECTION",
  "CASE_STUDY",
  "AVANT_APRES",
  "TEMOIGNAGES",
  "SERVICES",
  "STATISTIQUES",
  "VIDEO",
  "CONTACT",
] as const;
export type TypeBloc = (typeof TYPES_BLOC)[number];

export const THEMES_PORTFOLIO = ["MINIMAL", "SOMBRE", "EDITORIAL", "COLORE"] as const;
export type ThemePortfolio = (typeof THEMES_PORTFOLIO)[number];

export const STATUTS_PORTFOLIO = ["BROUILLON", "PUBLIE", "DEPUBLIE"] as const;
export type StatutPortfolio = (typeof STATUTS_PORTFOLIO)[number];

export const MISES_EN_PAGE = ["GRILLE", "MASONRY", "CARROUSEL", "PLEIN_ECRAN"] as const;
export type MiseEnPage = (typeof MISES_EN_PAGE)[number];

export const SOURCES_MEDIA = ["GALERIE_CLIENT", "UPLOAD_PERSONNEL"] as const;
export type SourceMedia = (typeof SOURCES_MEDIA)[number];

export const STATUTS_CONSENTEMENT = ["NON_REQUIS", "EN_ATTENTE", "ACCORDE", "REFUSE"] as const;
export type StatutConsentement = (typeof STATUTS_CONSENTEMENT)[number];

export const ROLES_ELEMENT = ["NORMAL", "AVANT", "APRES"] as const;
export type RoleElement = (typeof ROLES_ELEMENT)[number];

export const STATUTS_DEMANDE = ["NOUVELLE", "EN_COURS", "CONVERTIE", "REJETEE"] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];

export const RESEAUX_SOCIAUX = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "SITE_WEB"] as const;
export type Reseau = (typeof RESEAUX_SOCIAUX)[number];

export const VISIBILITES = ["PUBLIC", "PRIVE"] as const;
export type Visibilite = (typeof VISIBILITES)[number];

export type MediaPortfolio = {
  url: string;
  urlMiniature: string;
  largeur: number;
  hauteur: number;
  publicId: string;
};

export type ElementBlocPortfolio = {
  idElement: string;
  source: SourceMedia;
  photoId?: string;
  clientConcerne?: string;
  media: MediaPortfolio;
  titre?: string;
  legende?: string;
  legendeGenereeIA?: boolean;
  texteAlt?: string;
  texteAltGenereeIA?: boolean;
  ordreAffichage: number;
  estMisEnAvant: boolean;
  role: RoleElement;
  paire?: number;
  statutConsentement: StatutConsentement;
  dateConsentement?: string;
  nombreLikes: number;
  dateAjout: string;
};

export type BlocPortfolio = {
  idBloc: string;
  type: TypeBloc;
  ordre: number;
  visible: boolean;
  miseEnPage: MiseEnPage;
  configuration: Record<string, unknown>;
  elements: ElementBlocPortfolio[];
};

export type ElementPortfolioPublic = {
  idElement: string;
  media: Pick<MediaPortfolio, "url" | "urlMiniature" | "largeur" | "hauteur">;
  titre?: string;
  legende?: string;
  texteAlt?: string;
  ordreAffichage: number;
  estMisEnAvant: boolean;
  role: RoleElement;
  paire?: number;
  nombreLikes: number;
};

export type BlocPortfolioPublic = {
  idBloc: string;
  type: TypeBloc;
  ordre: number;
  visible: boolean;
  miseEnPage: MiseEnPage;
  configuration: Record<string, unknown>;
  elements: ElementPortfolioPublic[];
};

export const categoriePortfolioLabels: Record<CategoriePortfolio, string> = {
  MARIAGE: "Mariage",
  PORTRAIT: "Portrait",
  PRODUIT: "Produit",
  EVENEMENT: "Événement",
};

export const visibiliteConfig: StatusConfig<Visibilite> = {
  PUBLIC: { label: "Published", tone: "success" },
  PRIVE: { label: "Draft", tone: "neutral" },
};
