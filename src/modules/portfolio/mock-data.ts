/**
 * Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim
 * MOCK DATA — replace with portfolio.service.ts.
 */
import { inDays } from "@/lib/mock-data-helpers";
import { MOCK_IMAGES, mockImage, type ImageCategory } from "@/lib/mock-images";
import type {
  CandidatIA,
  CategoriePortfolio,
  ElementPortfolio,
  Portfolio,
} from "./portfolio.types";

const LEGENDES: Record<CategoriePortfolio, string[]> = {
  MARIAGE: [
    "First look under the olive trees of Carthage.",
    "The wedding rings, just before the ceremony.",
    "A shared burst of laughter leaving the town hall.",
    "Golden sunset light over the sea.",
    "The bride's peony bouquet.",
    "The first dance, surrounded by loved ones.",
  ],
  PORTRAIT: [
    "Natural-light portrait, Studio A.",
    "One look, one story.",
    "Corporate portrait, neutral background.",
    "Soft late-afternoon light.",
  ],
  PRODUIT: [
    "Steel watch, infinite white background.",
    "Headphones in a colorful setting.",
    "E-commerce packshot, controlled shadows.",
  ],
  EVENEMENT: [
    "The energy of the stage, caught on the fly.",
    "Tech Tunis conference, opening keynote.",
    "Confetti and lights for the finale.",
  ],
};

const CATEGORY_IMAGES: Record<CategoriePortfolio, ImageCategory> = {
  MARIAGE: "mariage",
  PORTRAIT: "portrait",
  PRODUIT: "produit",
  EVENEMENT: "evenement",
};

function elements(categorie: CategoriePortfolio, count: number, seed: number): ElementPortfolio[] {
  const images = MOCK_IMAGES[CATEGORY_IMAGES[categorie]];
  return Array.from({ length: count }, (_, i) => {
    const n = i + seed;
    return {
      id: `el-${categorie.toLowerCase()}-${seed}-${i + 1}`,
      titre: `Image ${i + 1}`,
      legende: LEGENDES[categorie][n % LEGENDES[categorie].length],
      legendeGenereeIA: n % 3 === 0,
      ordreAffichage: i + 1,
      estMisEnAvant: i < 2,
      consentementClient: n % 7 !== 4,
      dateAjout: inDays(-30 + i),
      photo: {
        id: `photo-${categorie}-${n}`,
        url: images[n % images.length],
        scoreQualite: 82 + ((n * 5) % 17),
      },
    };
  });
}

export const PORTFOLIOS: Portfolio[] = [
  {
    id: "pf-1",
    titre: "Mediterranean weddings",
    description:
      "Ceremonies, engagements and parties between Carthage, Sidi Bou Saïd and Hammamet.",
    categorie: "MARIAGE",
    slug: "mariages-mediterranee",
    photoCouverture: mockImage("mariage", 3),
    visibilite: "PUBLIC",
    nombreVues: 2841,
    datePublication: inDays(-80),
    dateCreation: inDays(-90),
    elements: elements("MARIAGE", 12, 0),
  },
  {
    id: "pf-2",
    titre: "Portraits",
    description: "Studio and natural-light portraits: solo, family and corporate.",
    categorie: "PORTRAIT",
    slug: "portraits",
    photoCouverture: mockImage("portrait", 11),
    visibilite: "PUBLIC",
    nombreVues: 1532,
    datePublication: inDays(-60),
    dateCreation: inDays(-70),
    elements: elements("PORTRAIT", 10, 1),
  },
  {
    id: "pf-3",
    titre: "Products & e-commerce",
    description: "White-background packshots and styled scenes for Tunisian brands.",
    categorie: "PRODUIT",
    slug: "produits",
    photoCouverture: mockImage("produit", 1),
    visibilite: "PUBLIC",
    nombreVues: 964,
    datePublication: inDays(-40),
    dateCreation: inDays(-45),
    elements: elements("PRODUIT", 7, 0),
  },
  {
    id: "pf-4",
    titre: "Events",
    description: "Launch parties, conferences and concerts, captured live.",
    categorie: "EVENEMENT",
    slug: "evenements",
    photoCouverture: mockImage("evenement", 4),
    visibilite: "PUBLIC",
    nombreVues: 711,
    datePublication: inDays(-25),
    dateCreation: inDays(-30),
    elements: elements("EVENEMENT", 9, 2),
  },
  {
    id: "pf-5",
    titre: "Engagements — 2026 season",
    description: "Selection in progress for the new season.",
    categorie: "MARIAGE",
    slug: "fiancailles-2026",
    photoCouverture: mockImage("mariage", 14),
    visibilite: "PRIVE",
    nombreVues: 0,
    dateCreation: inDays(-5),
    elements: elements("MARIAGE", 6, 4),
  },
];

export const CANDIDATS_IA: CandidatIA[] = MOCK_IMAGES.mariage.slice(5, 11).map((url, i) => ({
  photo: { id: `cand-${i}`, url, scoreQualite: 97 - i * 2 },
  galerie: i % 2 ? "Ons & Walid Wedding" : "Leïla & Sami engagement",
  consentementClient: i !== 2,
}));

export function getPortfolio(id: string) {
  return PORTFOLIOS.find((p) => p.id === id);
}

export function getPortfolioBySlug(slug: string) {
  return PORTFOLIOS.find((p) => p.slug === slug && p.visibilite === "PUBLIC");
}

export const PORTFOLIOS_PUBLICS = PORTFOLIOS.filter((p) => p.visibilite === "PUBLIC");
