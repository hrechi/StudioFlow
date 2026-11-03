import { z } from "zod";
import {
  CATEGORIES_PORTFOLIO,
  MISES_EN_PAGE,
  RESEAUX_SOCIAUX,
  ROLES_ELEMENT,
  SERVICES_PHOTOGRAPHIQUES,
  SOURCES_MEDIA,
  STYLES_PHOTOGRAPHIQUES,
  STATUTS_CONSENTEMENT,
  STATUTS_DEMANDE,
  THEMES_PORTFOLIO,
  VISIBILITES,
} from "./portfolio.types";
import { GALLERY_DISPLAY_MODES } from "./lib/galleryDisplayModes";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const mediaUrl = z
  .string()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("/api/"),
    "HTTPS URL or /api/ route required",
  );
const httpsUrl = z
  .string()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("/api/"),
    "HTTPS URL or /api/ route required",
  );
const hexColor = z.string().regex(/^#[\da-f]{6}$/i, "Invalid hex color");
const buttonHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) =>
      value.startsWith("#") ||
      (value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("https://"),
    "Use a site path, anchor or HTTPS URL.",
  );
const socialLinkSchema = z.object({ reseau: z.enum(RESEAUX_SOCIAUX), url: httpsUrl });

export const mediaPortfolioSchema = z.object({
  url: mediaUrl,
  urlMiniature: mediaUrl,
  largeur: z.number().int().positive(),
  hauteur: z.number().int().positive(),
  publicId: z.string().trim().min(1).max(255),
});

export const elementPortfolioSchema = z
  .object({
    // Accept any non-empty string — normalizeBlocks() in the service converts these
    // to valid 24-hex ObjectIds before writing to MongoDB.
    idElement: z.string().min(1).max(64),
    source: z.enum(SOURCES_MEDIA),
    photoId: z.string().min(1).max(64).optional(),
    clientConcerne: z.string().min(1).max(64).optional(),
    media: mediaPortfolioSchema,
    titre: z.string().trim().max(160).optional(),
    legende: z.string().trim().max(1000).optional(),
    legendeGenereeIA: z.boolean().default(false),
    texteAlt: z.string().trim().max(300).optional(),
    texteAltGenereeIA: z.boolean().default(false),
    ordreAffichage: z.number().int().min(0),
    estMisEnAvant: z.boolean().default(false),
    role: z.enum(ROLES_ELEMENT).default("NORMAL"),
    paire: z.number().int().positive().optional(),
    statutConsentement: z.enum(STATUTS_CONSENTEMENT).default("NON_REQUIS"),
    dateConsentement: z.iso.datetime().optional(),
    nombreLikes: z.number().int().min(0).default(0),
    dateAjout: z.iso.datetime(),
  })
  .superRefine((element, context) => {
    // UPLOAD_PERSONNEL must have NON_REQUIS consent status
    if (element.source === "UPLOAD_PERSONNEL" && element.statutConsentement !== "NON_REQUIS") {
      context.addIssue({
        code: "custom",
        path: ["statutConsentement"],
        message: "Personal uploads do not require client consent.",
      });
    }
    // GALERIE_CLIENT: only enforce when clientConcerne is explicitly provided but consent is missing.
    // If clientConcerne is absent, normalizeBlocks() will downgrade source to UPLOAD_PERSONNEL
    // before DB write — so we must not reject here.
    if (
      element.source === "GALERIE_CLIENT" &&
      element.clientConcerne &&
      element.statutConsentement === "NON_REQUIS"
    ) {
      context.addIssue({
        code: "custom",
        path: ["statutConsentement"],
        message: "Client gallery photos require explicit consent.",
      });
    }
    if (element.role !== "NORMAL" && element.paire === undefined) {
      context.addIssue({
        code: "custom",
        path: ["paire"],
        message: "Before/after elements must belong to a pair.",
      });
    }
  });

const baseBlock = {
  // Accept any non-empty string — normalizeBlocks() converts to valid ObjectId
  idBloc: z.string().min(1).max(64),
  ordre: z.number().int().min(0),
  visible: z.boolean().default(true),
  miseEnPage: z.enum(MISES_EN_PAGE).default("GRILLE"),
  elements: z.array(elementPortfolioSchema).max(500).default([]),
};

const heroConfiguration = z
  .object({
    titre: z.string().trim().min(1).max(160),
    sousTitre: z.string().trim().max(300),
    texteBouton: z.string().trim().max(80),
    lienBouton: buttonHref.optional(),
    tagline: z.string().trim().max(160).optional(),
    photoCouverture: z.string().optional(),
    videoFond: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) =>
          value === "" ||
          value.startsWith("https://") ||
          value.startsWith("/api/") ||
          (value.startsWith("/") && !value.startsWith("//")),
        "Use an HTTPS URL or a local site path.",
      )
      .optional(),
    liensSociaux: z
      .array(
        z.object({
          reseau: z.enum(RESEAUX_SOCIAUX),
          url: z.string().trim(),
        }),
      )
      .optional(),
  })
  .passthrough();

const aboutConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    texte: z.string().trim().max(5000).optional(),
    citation: z.string().trim().max(500).optional(),
    anneesExperience: z.number().int().min(0).max(100),
    photoPortrait: z.string().optional(),
    legendePortrait: z.string().trim().max(160).optional(),
    lieuBase: z.string().trim().max(160).optional(),
    depuis: z.string().trim().max(160).optional(),
    materiel: z.string().trim().max(240).optional(),
    langues: z.string().trim().max(160).optional(),
    delaiReponse: z.string().trim().max(100).optional(),
    zoneDeplacement: z.string().trim().max(160).optional(),
  })
  .passthrough();

const galleryConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    colonnes: z.number().int().min(2).max(4).optional(),
    espacement: z.number().int().min(0).max(100).optional(),
    categorie: z.enum(CATEGORIES_PORTFOLIO).optional(),
    modeAffichage: z.enum([...GALLERY_DISPLAY_MODES, "MUSEE"]).optional(),
  })
  .passthrough();

const caseStudyConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    texte: z.string().trim().max(5000).optional(),
    date: z.string().trim().max(40).optional(),
    lieu: z.string().trim().max(160).optional(),
    photo: z.string().optional(),
    seanceId: objectId.optional(),
  })
  .passthrough();

const avantApresConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    description: z.string().trim().max(500).optional(),
    photoAvant: z.string().optional(),
    photoApres: z.string().optional(),
  })
  .passthrough();

const testimonyConfiguration = z
  .object({
    titre: z.string().optional(),
    avisIds: z.array(objectId).max(100).optional(),
    temoignages: z.array(z.any()).optional(),
  })
  .passthrough();

const servicesConfiguration = z
  .object({
    titre: z.string().optional(),
    forfaits: z.array(z.any()).max(20).optional(),
  })
  .passthrough();

const processConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    etapes: z.array(z.object({
      titre: z.string().trim().max(100),
      description: z.string().trim().max(500),
    })).max(4).optional(),
  })
  .passthrough();

const faqConfiguration = z
  .object({
    titre: z.string().trim().max(160).optional(),
    questions: z.array(z.object({
      question: z.string().trim().max(240),
      reponse: z.string().trim().max(1200),
    })).max(20).optional(),
  })
  .passthrough();

const statisticsConfiguration = z
  .object({
    afficher: z.array(z.enum(["SEANCES", "CLIENTS", "NOTE_MOYENNE"])).optional(),
    stat1_valeur: z.string().optional(),
    stat1_label: z.string().optional(),
    stat2_valeur: z.string().optional(),
    stat2_label: z.string().optional(),
    stat3_valeur: z.string().optional(),
    stat3_label: z.string().optional(),
  })
  .passthrough();

const videoConfiguration = z
  .object({
    urlVideo: z
      .string()
      .trim()
      .default("")
      .transform((value) => (value === "https://" ? "" : value))
      .refine(
        (value) => value === "" || value.startsWith("https://") || value.startsWith("/api/"),
        "HTTPS URL or /api/ route required",
      ),
    titre: z.string().trim().max(160),
    affiche: z.string().optional(),
  })
  .passthrough();

const contactConfiguration = z
  .object({
    titre: z.string().optional(),
    texteIntro: z.string().trim().max(1000),
    typesSeanceProposes: z.array(z.enum(CATEGORIES_PORTFOLIO)).max(4).optional(),
    typesSeance: z.array(z.string()).max(10).optional(),
  })
  .passthrough();

export const blocPortfolioSchema = z.discriminatedUnion("type", [
  z.object({ ...baseBlock, type: z.literal("HERO"), configuration: heroConfiguration }),
  z.object({ ...baseBlock, type: z.literal("A_PROPOS"), configuration: aboutConfiguration }),
  z.object({ ...baseBlock, type: z.literal("GALERIE"), configuration: galleryConfiguration }),
  z.object({ ...baseBlock, type: z.literal("COLLECTION"), configuration: galleryConfiguration }),
  z.object({ ...baseBlock, type: z.literal("CASE_STUDY"), configuration: caseStudyConfiguration }),
  z.object({
    ...baseBlock,
    type: z.literal("AVANT_APRES"),
    configuration: avantApresConfiguration,
  }),
  z.object({ ...baseBlock, type: z.literal("TEMOIGNAGES"), configuration: testimonyConfiguration }),
  z.object({ ...baseBlock, type: z.literal("SERVICES"), configuration: servicesConfiguration }),
  z.object({ ...baseBlock, type: z.literal("PROCESSUS"), configuration: processConfiguration }),
  z.object({ ...baseBlock, type: z.literal("FAQ"), configuration: faqConfiguration }),
  z.object({
    ...baseBlock,
    type: z.literal("STATISTIQUES"),
    configuration: statisticsConfiguration,
  }),
  z.object({ ...baseBlock, type: z.literal("VIDEO"), configuration: videoConfiguration }),
  z.object({ ...baseBlock, type: z.literal("CONTACT"), configuration: contactConfiguration }),
]);

export const portfolioBlocksSchema = z
  .array(blocPortfolioSchema)
  .max(100)
  .superRefine((blocks, context) => {
    const blockIds = blocks.map((block) => block.idBloc);
    if (new Set(blockIds).size !== blockIds.length) {
      context.addIssue({ code: "custom", message: "Block identifiers must be unique." });
    }
    const orders = blocks.map((block) => block.ordre).sort((a, b) => a - b);
    if (orders.some((order, index) => order !== index)) {
      context.addIssue({
        code: "custom",
        message: "Block order must be continuous starting at zero.",
      });
    }
    if (blocks.filter((block) => block.type === "HERO").length > 1) {
      context.addIssue({
        code: "custom",
        message: "A portfolio can contain at most one HERO block.",
      });
    }

    const allElementIds: string[] = [];
    for (const [blockIndex, block] of blocks.entries()) {
      // Note: ordreAffichage continuity is enforced by normalizeBlocks() in the service,
      // not here, to avoid false rejections when elements are added/removed client-side.
      const pairRoles = new Map<number, { AVANT: number; APRES: number }>();
      for (const element of block.elements) {
        allElementIds.push(element.idElement);
        if (element.role === "NORMAL") continue;
        if (block.type !== "AVANT_APRES") {
          context.addIssue({
            code: "custom",
            path: [blockIndex, "elements"],
            message: "Before/after roles are only valid in an AVANT_APRES block.",
          });
        }
        if (element.paire === undefined) continue;
        const counts = pairRoles.get(element.paire) ?? { AVANT: 0, APRES: 0 };
        counts[element.role] += 1;
        pairRoles.set(element.paire, counts);
      }
      for (const [pair, counts] of pairRoles) {
        if (counts.AVANT !== 1 || counts.APRES !== 1) {
          context.addIssue({
            code: "custom",
            path: [blockIndex, "elements"],
            message: `Pair ${pair} requires both AVANT and APRES elements.`,
          });
        }
      }
    }
    if (new Set(allElementIds).size !== allElementIds.length) {
      context.addIssue({ code: "custom", message: "Photo element identifiers must be unique." });
    }
  });

export const portfolioCreateSchema = z.object({
  titre: z.string().trim().min(1).max(160),
  slogan: z.string().trim().max(300).optional(),
  bio: z.string().trim().max(5000).optional(),
  photoCouverture: httpsUrl,
  specialites: z
    .array(z.enum(CATEGORIES_PORTFOLIO))
    .max(5)
    .refine((values) => new Set(values).size === values.length, "Specialties cannot be repeated.")
    .default([]),
  styles: z.array(z.enum(STYLES_PHOTOGRAPHIQUES)).max(6).default([]),
  services: z.array(z.enum(SERVICES_PHOTOGRAPHIQUES)).max(4).default([]),
  disponible: z.boolean().default(false),
  ville: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  pays: z.string().trim().max(120).optional(),
  theme: z.enum(THEMES_PORTFOLIO).default("MINIMAL"),
  couleurAccent: hexColor.default("#e0563b"),
  filigrane: z.boolean().default(false),
  visibilite: z.enum(VISIBILITES).default("PUBLIC"),
  structureInitiale: z.enum(["MODELE", "VIDE"]).default("MODELE"),
  liensSociaux: z.array(socialLinkSchema).max(10).default([]),
});

const seoSchema = z.object({
  metaTitre: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  imageOG: httpsUrl.optional(),
});
export const plancheContactFrameSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  timestamp: z.number().min(0),
  caption: z.string().max(100).optional(),
  order: z.number().int().min(0),
});

export const plancheContactSchema = z.object({
  active: z.boolean().default(true),
  videoUrl: z.string().optional(),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
  frames: z.array(plancheContactFrameSchema).default([]),
});

export const portfolioUpdateSchema = z.object({
  titre: z.string().trim().min(1).max(160).optional(),
  slogan: z.string().trim().max(300).optional(),
  bio: z.string().trim().max(5000).optional(),
  photoCouverture: httpsUrl.optional(),
  specialites: z
    .array(z.enum(CATEGORIES_PORTFOLIO))
    .max(5)
    .refine((values) => new Set(values).size === values.length, "Specialties cannot be repeated.")
    .optional(),
  styles: z.array(z.enum(STYLES_PHOTOGRAPHIQUES)).max(6).optional(),
  services: z.array(z.enum(SERVICES_PHOTOGRAPHIQUES)).max(4).optional(),
  disponible: z.boolean().optional(),
  ville: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  pays: z.string().trim().max(120).optional(),
  theme: z.enum(THEMES_PORTFOLIO).optional(),
  couleurAccent: hexColor.optional(),
  filigrane: z.boolean().optional(),
  visibilite: z.enum(VISIBILITES).optional(),
  liensSociaux: z.array(socialLinkSchema).max(10).optional(),
  seo: seoSchema.optional(),
  plancheContact: plancheContactSchema.optional(),
});

export const publicPortfolioSearchSchema = z.object({
  recherche: z.string().trim().max(120).optional(),
  ville: z.string().trim().max(120).optional(),
  categories: z.array(z.enum(CATEGORIES_PORTFOLIO)).max(5).default([]),
  styles: z.array(z.enum(STYLES_PHOTOGRAPHIQUES)).max(6).default([]),
  services: z.array(z.enum(SERVICES_PHOTOGRAPHIQUES)).max(4).default([]),
  disponible: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
});

export const savePortfolioSchema = z.object({
  portfolioId: objectId,
  blocs: portfolioBlocksSchema,
});
export const publishPortfolioSchema = z.object({ portfolioId: objectId });
export const portfolioIdSchema = z.object({ portfolioId: objectId });
export const consentSchema = z.object({ elementId: objectId, accord: z.boolean() });

export const contactPortfolioSchema = z.object({
  portfolioId: objectId,
  nomVisiteur: z.string().trim().min(1).max(120),
  email: z.email().max(320),
  telephone: z.string().trim().max(40).optional(),
  typeSeance: z.enum(CATEGORIES_PORTFOLIO),
  dateSouhaitee: z.iso.date().optional(),
  lieu: z.string().trim().max(160).optional(),
  budget: z.string().trim().max(80).optional(),
  forfaitDemande: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(500),
  honeypot: z.string().max(0).optional(),
});

export const contactStatusSchema = z.object({ id: objectId, statut: z.enum(STATUTS_DEMANDE) });

export type PortfolioCreateInput = z.infer<typeof portfolioCreateSchema>;
export type PortfolioUpdateInput = z.infer<typeof portfolioUpdateSchema>;
export type PublicPortfolioSearchInput = z.infer<typeof publicPortfolioSearchSchema>;
export type BlocPortfolioInput = z.infer<typeof blocPortfolioSchema>;
export type ContactPortfolioInput = z.infer<typeof contactPortfolioSchema>;
