import { z } from "zod";
import {
  CATEGORIES_PORTFOLIO,
  MISES_EN_PAGE,
  RESEAUX_SOCIAUX,
  ROLES_ELEMENT,
  SOURCES_MEDIA,
  STATUTS_CONSENTEMENT,
  STATUTS_DEMANDE,
  THEMES_PORTFOLIO,
  VISIBILITES,
} from "./portfolio.types";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const mediaUrl = z.string().refine((value) => value.startsWith("https://") || value.startsWith("/api/"), "HTTPS URL or /api/ route required");
const httpsUrl = z.string().refine((value) => value.startsWith("https://") || value.startsWith("/api/"), "HTTPS URL or /api/ route required");
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

export const mediaPortfolioSchema = z.object({
  url: mediaUrl,
  urlMiniature: mediaUrl,
  largeur: z.number().int().positive(),
  hauteur: z.number().int().positive(),
  publicId: z.string().trim().min(1).max(255),
});

export const elementPortfolioSchema = z
  .object({
    idElement: objectId,
    source: z.enum(SOURCES_MEDIA),
    photoId: objectId.optional(),
    clientConcerne: objectId.optional(),
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
    if (element.source === "UPLOAD_PERSONNEL" && element.statutConsentement !== "NON_REQUIS") {
      context.addIssue({
        code: "custom",
        path: ["statutConsentement"],
        message: "Personal uploads do not require client consent.",
      });
    }
    if (
      element.source === "GALERIE_CLIENT" &&
      (!element.clientConcerne || element.statutConsentement === "NON_REQUIS")
    ) {
      context.addIssue({
        code: "custom",
        path: ["clientConcerne"],
        message: "Client gallery photos require an identified client and explicit consent.",
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
  idBloc: objectId,
  ordre: z.number().int().min(0),
  visible: z.boolean().default(true),
  miseEnPage: z.enum(MISES_EN_PAGE).default("GRILLE"),
  elements: z.array(elementPortfolioSchema).max(500).default([]),
};

const heroConfiguration = z.object({
  titre: z.string().trim().min(1).max(160),
  sousTitre: z.string().trim().max(300),
  texteBouton: z.string().trim().max(80),
  lienBouton: buttonHref.optional(),
  tagline: z.string().trim().max(160).optional(),
  photoCouverture: z.string().optional(),
  liensSociaux: z.array(z.object({
    reseau: z.enum(RESEAUX_SOCIAUX),
    url: z.string().trim(),
  })).optional(),
}).passthrough();

const aboutConfiguration = z.object({
  titre: z.string().trim().max(160).optional(),
  texte: z.string().trim().min(1).max(5000),
  anneesExperience: z.number().int().min(0).max(100),
  photoPortrait: z.string().optional(),
}).passthrough();

const galleryConfiguration = z.object({
  titre: z.string().trim().max(160).optional(),
  colonnes: z.number().int().min(2).max(4),
  espacement: z.number().int().min(0).max(100),
  categorie: z.enum(CATEGORIES_PORTFOLIO).optional(),
}).passthrough();

const caseStudyConfiguration = z.object({
  titre: z.string().trim().min(1).max(160),
  texte: z.string().trim().max(5000),
  date: z.string().trim().max(40),
  lieu: z.string().trim().max(160),
  photo: z.string().optional(),
  seanceId: objectId.optional(),
}).passthrough();

const avantApresConfiguration = z.object({
  titre: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  photoAvant: z.string().optional(),
  photoApres: z.string().optional(),
}).passthrough();

const testimonyConfiguration = z.object({
  titre: z.string().optional(),
  avisIds: z.array(objectId).max(100).optional(),
  temoignages: z.array(z.any()).optional(),
}).passthrough();

const servicesConfiguration = z.object({
  titre: z.string().optional(),
  forfaits: z.array(z.any()).max(20).optional(),
}).passthrough();

const statisticsConfiguration = z.object({
  afficher: z.array(z.enum(["SEANCES", "CLIENTS", "NOTE_MOYENNE"])).optional(),
  stat1_valeur: z.string().optional(),
  stat1_label: z.string().optional(),
  stat2_valeur: z.string().optional(),
  stat2_label: z.string().optional(),
  stat3_valeur: z.string().optional(),
  stat3_label: z.string().optional(),
}).passthrough();

const videoConfiguration = z.object({
  urlVideo: httpsUrl,
  titre: z.string().trim().max(160),
  affiche: z.string().optional(),
}).passthrough();

const contactConfiguration = z.object({
  titre: z.string().optional(),
  texteIntro: z.string().trim().max(1000),
  typesSeanceProposes: z.array(z.enum(CATEGORIES_PORTFOLIO)).max(4).optional(),
  typesSeance: z.array(z.string()).max(10).optional(),
}).passthrough();

export const blocPortfolioSchema = z.discriminatedUnion("type", [
  z.object({ ...baseBlock, type: z.literal("HERO"), configuration: heroConfiguration }),
  z.object({ ...baseBlock, type: z.literal("A_PROPOS"), configuration: aboutConfiguration }),
  z.object({ ...baseBlock, type: z.literal("GALERIE"), configuration: galleryConfiguration }),
  z.object({ ...baseBlock, type: z.literal("COLLECTION"), configuration: galleryConfiguration }),
  z.object({ ...baseBlock, type: z.literal("CASE_STUDY"), configuration: caseStudyConfiguration }),
  z.object({ ...baseBlock, type: z.literal("AVANT_APRES"), configuration: avantApresConfiguration }),
  z.object({ ...baseBlock, type: z.literal("TEMOIGNAGES"), configuration: testimonyConfiguration }),
  z.object({ ...baseBlock, type: z.literal("SERVICES"), configuration: servicesConfiguration }),
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
      const elementOrders = block.elements
        .map((element) => element.ordreAffichage)
        .sort((a, b) => a - b);
      if (elementOrders.some((order, index) => order !== index)) {
        context.addIssue({
          code: "custom",
          path: [blockIndex, "elements"],
          message: "Element order must be continuous starting at zero.",
        });
      }
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
    .max(4)
    .refine((values) => new Set(values).size === values.length, "Specialties cannot be repeated.")
    .default([]),
  ville: z.string().trim().max(120).optional(),
  theme: z.enum(THEMES_PORTFOLIO).default("MINIMAL"),
  couleurAccent: hexColor.default("#146BFF"),
  filigrane: z.boolean().default(false),
  visibilite: z.enum(VISIBILITES).default("PUBLIC"),
  structureInitiale: z.enum(["MODELE", "VIDE"]).default("MODELE"),
});

const seoSchema = z.object({
  metaTitre: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  imageOG: httpsUrl.optional(),
});
const socialLinkSchema = z.object({ reseau: z.enum(RESEAUX_SOCIAUX), url: httpsUrl });

export const portfolioUpdateSchema = portfolioCreateSchema
  .omit({ structureInitiale: true })
  .partial()
  .extend({
    seo: seoSchema.optional(),
    liensSociaux: z.array(socialLinkSchema).max(10).optional(),
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
  message: z.string().trim().min(1).max(3000),
  honeypot: z.string().max(0).optional(),
});

export const contactStatusSchema = z.object({ id: objectId, statut: z.enum(STATUTS_DEMANDE) });

export type PortfolioCreateInput = z.infer<typeof portfolioCreateSchema>;
export type PortfolioUpdateInput = z.infer<typeof portfolioUpdateSchema>;
export type BlocPortfolioInput = z.infer<typeof blocPortfolioSchema>;
export type ContactPortfolioInput = z.infer<typeof contactPortfolioSchema>;
