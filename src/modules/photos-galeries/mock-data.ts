/**
 * Module : Gestion des Photos & Galeries · Responsable : Louay Herichi
 * MOCK DATA — replace with photo.service.ts / galerie.service.ts (Mongoose + Cloudinary).
 */
import { MOCK_CLIENTS, MOCK_CURRENT_CLIENT, inDays } from "@/lib/mock-data-helpers";
import { MOCK_IMAGES, mockImage, type ImageCategory } from "@/lib/mock-images";
import type { Galerie, Photo, StatutCulling } from "./galerie.types";

const [sarra, omar, leila, jasmin, nour, medina] = MOCK_CLIENTS;

export const GALERIES: Galerie[] = [
  {
    id: "galerie-1",
    titre: "Leïla & Sami engagement",
    categorie: "Wedding",
    photoCouverture: mockImage("mariage", 9),
    lienAcces: "https://studioflow.tn/g/leila-sami-7f3k",
    motDePasse: "carthage",
    dateExpiration: inDays(30),
    telechargementAutorise: false,
    statut: "EN_TRI",
    dateCreation: inDays(-3),
    seance: { id: "seance-6", titre: "Leïla & Sami engagement" },
    client: leila,
    nombrePhotos: 384,
    nombreSelection: 0,
  },
  {
    id: "galerie-2",
    titre: "Sarra maternity session",
    categorie: "Portrait",
    photoCouverture: mockImage("portrait", 4),
    lienAcces: "https://studioflow.tn/g/sarra-grossesse-2b9x",
    motDePasse: "bebe2026",
    dateExpiration: inDays(21),
    telechargementAutorise: true,
    statut: "PARTAGEE",
    dateCreation: inDays(-18),
    seance: { id: "seance-8", titre: "Sarra maternity session" },
    client: sarra,
    nombrePhotos: 86,
    nombreSelection: 12,
  },
  {
    id: "galerie-3",
    titre: "Watch shoot — Atelier Médina",
    categorie: "Product",
    photoCouverture: mockImage("produit", 6),
    lienAcces: "https://studioflow.tn/g/medina-montres-4q1z",
    dateExpiration: inDays(14),
    telechargementAutorise: true,
    statut: "VALIDEE",
    dateCreation: inDays(-8),
    seance: { id: "seance-7", titre: "Watch shoot — Atelier Médina" },
    client: medina,
    nombrePhotos: 142,
    nombreSelection: 42,
  },
  {
    id: "galerie-4",
    titre: "Ons & Walid Wedding",
    categorie: "Wedding",
    photoCouverture: mockImage("mariage", 10),
    lienAcces: "https://studioflow.tn/g/ons-walid-9d2w",
    motDePasse: "hammamet",
    dateExpiration: inDays(-2),
    telechargementAutorise: true,
    statut: "LIVREE",
    dateCreation: inDays(-60),
    seance: { id: "seance-x1", titre: "Ons & Walid Wedding" },
    client: omar,
    nombrePhotos: 612,
    nombreSelection: 180,
  },
  {
    id: "galerie-5",
    titre: "Corporate portraits — Maison Jasmin",
    categorie: "Portrait",
    photoCouverture: mockImage("portrait", 8),
    lienAcces: "https://studioflow.tn/g/jasmin-corporate-1k8c",
    dateExpiration: inDays(10),
    telechargementAutorise: false,
    statut: "PARTAGEE",
    dateCreation: inDays(-6),
    seance: { id: "seance-x2", titre: "Corporate portraits — Maison Jasmin" },
    client: jasmin,
    nombrePhotos: 64,
    nombreSelection: 5,
  },
  {
    id: "galerie-6",
    titre: "Nour Cosmetics party 2025",
    categorie: "Event",
    photoCouverture: mockImage("evenement", 1),
    lienAcces: "https://studioflow.tn/g/nour-soiree-6h4m",
    dateExpiration: inDays(45),
    telechargementAutorise: true,
    statut: "LIVREE",
    dateCreation: inDays(-120),
    seance: { id: "seance-x3", titre: "Nour Cosmetics party 2025" },
    client: nour,
    nombrePhotos: 240,
    nombreSelection: 64,
  },
  {
    id: "galerie-7",
    titre: "Sarra & Amine Wedding — preview",
    categorie: "Wedding",
    photoCouverture: mockImage("mariage", 0),
    lienAcces: "https://studioflow.tn/g/sarra-amine-3p7r",
    motDePasse: "amine2026",
    dateExpiration: inDays(60),
    telechargementAutorise: false,
    statut: "PARTAGEE",
    dateCreation: inDays(-1),
    seance: { id: "seance-1", titre: "Sarra & Amine Wedding" },
    client: sarra,
    nombrePhotos: 24,
    nombreSelection: 3,
  },
];

const TAGS: Record<ImageCategory, string[][]> = {
  mariage: [
    ["bride", "smile", "outdoors"],
    ["couple", "sunset"],
    ["wedding rings", "detail"],
    ["couple", "laughing", "garden"],
    ["decoration", "chairs"],
    ["bride", "beach", "veil"],
    ["guests", "confetti"],
    ["table", "decoration"],
  ],
  portrait: [
    ["portrait", "smile"],
    ["portrait", "studio"],
    ["woman", "natural light"],
  ],
  produit: [["watch", "white background"], ["headphones", "yellow"], ["camera"]],
  evenement: [
    ["crowd", "stage"],
    ["conference", "audience"],
  ],
  studio: [["studio", "lighting"]],
};

function buildPhotos(
  galerieId: string,
  category: ImageCategory,
  count: number,
  seed: number,
): Photo[] {
  const urls = MOCK_IMAGES[category];
  return Array.from({ length: count }, (_, i) => {
    const n = i + seed;
    const estFloue = n % 7 === 3;
    const yeuxFermes = n % 11 === 5;
    const groupeDoublon = n % 9 === 1 || n % 9 === 2 ? `dup-${Math.floor(n / 9)}` : undefined;
    const score = estFloue ? 38 + (n % 10) : yeuxFermes ? 55 + (n % 8) : 72 + ((n * 7) % 27);
    const statutCulling: StatutCulling =
      estFloue || yeuxFermes
        ? "REJETEE"
        : score > 85
          ? "RETENUE"
          : n % 3 === 0
            ? "EN_ATTENTE"
            : "RETENUE";
    const url = urls[n % urls.length];
    return {
      id: `${galerieId}-photo-${i + 1}`,
      galerieId,
      nomFichier: `IMG_${String(4200 + n).padStart(4, "0")}.CR3`,
      url,
      urlMiniature: url.replace("w=1600", "w=480"),
      format: "RAW (CR3)",
      taille: 24_000_000 + ((n * 1_234_567) % 9_000_000),
      datePrise: inDays(-4, 16 + (i % 4), (i * 7) % 60),
      scoreQualite: score,
      estFloue,
      yeuxFermes,
      groupeDoublon,
      tagsIA: TAGS[category][n % TAGS[category].length],
      statutCulling,
      estFavori: n % 5 === 0,
      estSelectionnee: n % 4 === 0,
      commentaireClient: n % 8 === 0 ? "Beautiful! Could we crop it a little tighter?" : undefined,
      ordreHistoire: i + 1,
      dateUpload: inDays(-3, 9),
    };
  });
}

/** Photo library (all galleries, newest first). */
export const PHOTOS: Photo[] = [
  ...buildPhotos("galerie-1", "mariage", 16, 0),
  ...buildPhotos("galerie-2", "portrait", 6, 3),
  ...buildPhotos("galerie-3", "produit", 6, 1),
  ...buildPhotos("galerie-6", "evenement", 4, 2),
];

export const TAG_CLOUD = [
  "bride",
  "couple",
  "smile",
  "outdoors",
  "detail",
  "portrait",
  "studio",
  "white background",
  "sunset",
  "guests",
];

export function getGalerie(id: string): Galerie | undefined {
  return GALERIES.find((galerie) => galerie.id === id);
}

export function getPhotosOfGalerie(id: string): Photo[] {
  const photos = PHOTOS.filter((photo) => photo.galerieId === id);
  // Galleries without dedicated mock photos reuse a generated set.
  return photos.length ? photos : buildPhotos(id, "mariage", 12, 4);
}

/** Galleries of the client shown in the client-area templates. */
export const MES_GALERIES = GALERIES.filter(
  (g) => g.client.id === MOCK_CURRENT_CLIENT.id && g.statut !== "EN_TRI",
);

/** Example natural-language query for the AI search template. */
export const EXEMPLE_RECHERCHE = "the bride laughing outdoors at sunset";
