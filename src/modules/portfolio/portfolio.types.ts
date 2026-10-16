/**
 * Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim
 * Types from the class diagram (cahier §4.3) — Portfolio, ElementPortfolio (embedded, §4.4).
 */
import type { StatusConfig } from "@/components/shared/status-badge";

export const CATEGORIES_PORTFOLIO = ["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"] as const;
export type CategoriePortfolio = (typeof CATEGORIES_PORTFOLIO)[number];

export const VISIBILITES = ["PUBLIC", "PRIVE"] as const;
export type Visibilite = (typeof VISIBILITES)[number];

/** Embedded in Portfolio (ordered list read in one query). */
export type ElementPortfolio = {
  id: string;
  titre: string;
  legende: string;
  legendeGenereeIA: boolean;
  ordreAffichage: number;
  estMisEnAvant: boolean;
  consentementClient: boolean;
  dateAjout: string;
  photo: { id: string; url: string; scoreQualite: number }; // ref → Photo ("présentée dans")
};

/** Collection `portfolios`. */
export type Portfolio = {
  id: string;
  titre: string;
  description: string;
  categorie: CategoriePortfolio;
  slug: string;
  photoCouverture: string;
  visibilite: Visibilite;
  nombreVues: number;
  datePublication?: string;
  dateCreation: string;
  elements: ElementPortfolio[];
};

/** AI best-photo candidates (cahier: selectionnerMeilleuresPhotosIA). */
export type CandidatIA = {
  photo: { id: string; url: string; scoreQualite: number };
  galerie: string;
  consentementClient: boolean;
};

export const categoriePortfolioLabels: Record<CategoriePortfolio, string> = {
  MARIAGE: "Wedding",
  PORTRAIT: "Portrait",
  PRODUIT: "Product",
  EVENEMENT: "Event",
};

export const visibiliteConfig: StatusConfig<Visibilite> = {
  PUBLIC: { label: "Published", tone: "success" },
  PRIVE: { label: "Draft", tone: "neutral" },
};
