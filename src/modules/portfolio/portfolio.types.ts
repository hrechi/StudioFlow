/**
 * Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim
 * Types from the class diagram (cahier §4.3) — Portfolio, ElementPortfolio (embedded, §4.4).
 */
import type { StatusConfig } from "@/components/shared/status-badge";

export const CATEGORIES_PORTFOLIO = [
  "MARIAGE",
  "PORTRAIT",
  "PRODUIT",
  "EVENEMENT",
  "MODE",
] as const;
export type CategoriePortfolio = (typeof CATEGORIES_PORTFOLIO)[number];

export const STYLES_PHOTOGRAPHIQUES = [
  "MINIMALISTE",
  "ARTISTIQUE",
  "VINTAGE",
  "LIFESTYLE",
  "EDITORIAL",
  "DOCUMENTAIRE",
] as const;
export type StylePhotographique = (typeof STYLES_PHOTOGRAPHIQUES)[number];

export const SERVICES_PHOTOGRAPHIQUES = [
  "PHOTOGRAPHIE",
  "VIDEOGRAPHIE",
  "RETOUCHE",
  "IMPRESSION",
] as const;
export type ServicePhotographique = (typeof SERVICES_PHOTOGRAPHIQUES)[number];

export const TYPES_BLOC = [
  "HERO",
  "GALERIE",
  "COLLECTION",
  "A_PROPOS",
  "CASE_STUDY",
  "AVANT_APRES",
  "TEMOIGNAGES",
  "SERVICES",
  "PROCESSUS",
  "FAQ",
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
  categorie?: CategoriePortfolio;
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

export type PortfolioQualityCriterion = {
  id:
    | "COVER"
    | "PHOTO_COHERENCE"
    | "PHOTO_VARIETY"
    | "TITLES"
    | "TEXTS"
    | "CTA"
    | "TESTIMONIALS"
    | "SERVICES"
    | "SEO"
    | "MOBILE"
    | "PERFORMANCE"
    | "ACCESSIBILITY";
  label: string;
  score: number;
  maxScore: number;
  status: "GOOD" | "WARNING" | "ACTION";
  detail: string;
  recommendedBlock?: TypeBloc;
};

export type PortfolioQualityAudit = {
  score: number;
  aiSuggestionsAvailable: boolean;
  criteria: PortfolioQualityCriterion[];
  strengths: string[];
  improvements: string[];
  missingBlocks: { type: TypeBloc; label: string; reason: string }[];
  idealStructure: TypeBloc[];
  checksPublication: {
    id: "CONSENT" | "ALT_TEXT" | "SEO" | "PROFILE_PHOTO";
    label: string;
    status: "READY" | "ACTION";
    detail: string;
  }[];
  generatedAt: string;
};

export type PhotoQualityReport = {
  raison: string;
  nettete: number;
  exposition: number;
  composition: number;
  couleurs: number;
  defauts: string[];
};

export type SmartPhotoSelection = {
  photoIds: string[];
  scores: Record<string, number>;
  reports?: Record<string, PhotoQualityReport>;
  similarPhotoIds: string[];
  lowQualityPhotoIds: string[];
  selectionValidated?: boolean;
};

export const PHOTO_QUALITY_SELECTION_THRESHOLD = 50;
export const MAX_AUTOMATIC_PORTFOLIO_PHOTOS = 12;

export const categoriePortfolioLabels: Record<CategoriePortfolio, string> = {
  MARIAGE: "Mariage",
  PORTRAIT: "Portrait",
  PRODUIT: "Produit",
  EVENEMENT: "Événement",
  MODE: "Mode",
};

export const categoriePortfolioLabelsEn: Record<CategoriePortfolio, string> = {
  MARIAGE: "Wedding",
  PORTRAIT: "Portrait",
  PRODUIT: "Product",
  EVENEMENT: "Event",
  MODE: "Fashion",
};

export const STRUCTURE_PORTFOLIO_PAR_SPECIALITE: Record<CategoriePortfolio, TypeBloc[]> = {
  MARIAGE: ["HERO", "GALERIE", "A_PROPOS", "SERVICES", "PROCESSUS", "TEMOIGNAGES", "FAQ", "CONTACT"],
  PORTRAIT: ["HERO", "A_PROPOS", "GALERIE", "SERVICES", "PROCESSUS", "TEMOIGNAGES", "FAQ", "CONTACT"],
  PRODUIT: ["HERO", "GALERIE", "CASE_STUDY", "A_PROPOS", "SERVICES", "FAQ", "CONTACT"],
  EVENEMENT: ["HERO", "GALERIE", "A_PROPOS", "CASE_STUDY", "TEMOIGNAGES", "FAQ", "CONTACT"],
  MODE: ["HERO", "GALERIE", "A_PROPOS", "CASE_STUDY", "SERVICES", "TEMOIGNAGES", "CONTACT"],
};

export const STRUCTURE_PORTFOLIO_DEFAUT: TypeBloc[] = [
  "HERO",
  "A_PROPOS",
  "GALERIE",
  "COLLECTION",
  "CASE_STUDY",
  "AVANT_APRES",
  "SERVICES",
  "PROCESSUS",
  "TEMOIGNAGES",
  "STATISTIQUES",
  "FAQ",
  "CONTACT",
];

export const stylePhotographiqueLabels: Record<StylePhotographique, string> = {
  MINIMALISTE: "Minimaliste",
  ARTISTIQUE: "Artistique",
  VINTAGE: "Vintage",
  LIFESTYLE: "Lifestyle",
  EDITORIAL: "Éditorial",
  DOCUMENTAIRE: "Documentaire",
};

export const stylePhotographiqueLabelsEn: Record<StylePhotographique, string> = {
  MINIMALISTE: "Minimalist",
  ARTISTIQUE: "Artistic",
  VINTAGE: "Vintage",
  LIFESTYLE: "Lifestyle",
  EDITORIAL: "Editorial",
  DOCUMENTAIRE: "Documentary",
};

export const servicePhotographiqueLabels: Record<ServicePhotographique, string> = {
  PHOTOGRAPHIE: "Photographie",
  VIDEOGRAPHIE: "Vidéographie",
  RETOUCHE: "Retouche",
  IMPRESSION: "Impression",
};

export const servicePhotographiqueLabelsEn: Record<ServicePhotographique, string> = {
  PHOTOGRAPHIE: "Photography",
  VIDEOGRAPHIE: "Videography",
  RETOUCHE: "Retouching",
  IMPRESSION: "Fine Art Print",
};

export const visibiliteConfig: StatusConfig<Visibilite> = {
  PUBLIC: { label: "Published", tone: "success" },
  PRIVE: { label: "Draft", tone: "neutral" },
};

export type PlancheContactFrame = {
  id: string;
  imageUrl: string;
  timestamp: number;
  caption?: string;
  order: number;
};

export type PlancheContactData = {
  active: boolean;
  videoUrl?: string;
  trimStart?: number;
  trimEnd?: number;
  frames: PlancheContactFrame[];
};
