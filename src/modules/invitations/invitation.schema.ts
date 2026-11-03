/**
 * Module : Gestion des Invitations.
 * The invitation document. This Zod schema is the single source of truth: the editor, the
 * templates, the database and the public page all read and write this exact shape.
 */
import { z } from "zod";

export const POLICES = [
  "Great Vibes",
  "Playfair Display",
  "Cormorant Garamond",
  "Montserrat",
  "Amiri",
  "Cairo",
] as const;
export type Police = (typeof POLICES)[number];

export const LANGUES = ["fr", "en", "ar"] as const;
export type Langue = (typeof LANGUES)[number];

export const TONS = ["ELEGANT", "ROMANTIQUE", "JOYEUX", "SIMPLE"] as const;
export type Ton = (typeof TONS)[number];

/** Form fields a text element of the card can follow (see invitation.linked.ts). */
export const CHAMPS_LIES = ["noms", "nomA", "nomB", "date", "heure", "lieu", "message"] as const;
export type ChampLie = (typeof CHAMPS_LIES)[number];

export const FORMES = ["rect", "ellipse", "line", "heart"] as const;
export type Forme = (typeof FORMES)[number];

const couleur = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.");
const position = z.number().min(-5000).max(5000);
const dimension = z.number().min(1).max(5000);

/**
 * Images stay inside the project: a bundled decoration or a file the client uploaded. Outside
 * links are refused here because they would taint the canvas and break the export.
 */
export const SOURCE_IMAGE = /^(\/invitations\/decorations\/[a-z0-9-]+\.svg|\/api\/invitations\/images\/[0-9a-f]{24})$/;
const sourceImage = z.string().regex(SOURCE_IMAGE, "Images must come from the studio library or your uploads.");

const baseElement = {
  id: z.string().min(1).max(64),
  x: position,
  y: position,
  width: dimension,
  height: dimension,
  rotation: z.number().min(-360).max(360),
  layer: z.number().int().min(0).max(10_000),
};

const elementTexte = z.object({
  ...baseElement,
  type: z.literal("text"),
  text: z.string().max(2000),
  linkedTo: z.enum(CHAMPS_LIES).optional(),
  style: z.object({
    fontFamily: z.enum(POLICES),
    fontSize: z.number().min(6).max(300),
    color: couleur,
    align: z.enum(["left", "center", "right"]),
    opacity: z.number().min(0).max(1),
    bold: z.boolean(),
    italic: z.boolean(),
    letterSpacing: z.number().min(0).max(40),
  }).strict(),
}).strict();

const elementImage = z.object({
  ...baseElement,
  type: z.literal("image"),
  src: sourceImage,
  style: z.object({ opacity: z.number().min(0).max(1) }).strict(),
}).strict();

const elementForme = z.object({
  ...baseElement,
  type: z.literal("shape"),
  shape: z.enum(FORMES),
  style: z.object({
    fill: couleur.nullable(),
    stroke: couleur.nullable(),
    strokeWidth: z.number().min(0).max(60),
    opacity: z.number().min(0).max(1),
  }).strict(),
}).strict();

export const elementSchema = z.discriminatedUnion("type", [elementTexte, elementImage, elementForme]);
export type ElementInvitation = z.infer<typeof elementSchema>;
export type ElementTexte = z.infer<typeof elementTexte>;
export type ElementImage = z.infer<typeof elementImage>;
export type ElementForme = z.infer<typeof elementForme>;

/** Empty strings are allowed while a draft is being filled in; only a real date or time is checked. */
export const detailsSchema = z.object({
  nomA: z.string().trim().max(60),
  nomB: z.string().trim().max(60),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Choose a valid date."),
  heure: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Choose a valid time."),
  lieu: z.string().trim().max(160),
  message: z.string().trim().max(600),
  langue: z.enum(LANGUES),
}).strict();
export type DetailsInvitation = z.infer<typeof detailsSchema>;

export const contenuSchema = z.object({
  size: z.object({ width: z.number().min(200).max(1000), height: z.number().min(200).max(1000) }).strict(),
  background: z.object({ color: couleur, image: sourceImage.optional() }).strict(),
  elements: z.array(elementSchema).max(150, "An invitation can hold up to 150 elements."),
  details: detailsSchema,
}).strict();
export type ContenuInvitation = z.infer<typeof contenuSchema>;

export const titreSchema = z.string().trim().min(1, "Give your invitation a name.").max(80);

export const saveInvitationSchema = z.object({ titre: titreSchema, contenu: contenuSchema }).strict();

export const createInvitationSchema = z.object({
  titre: titreSchema,
  templateId: z.string().min(1).max(40),
}).strict();

export const redactionSchema = z.object({
  ton: z.enum(TONS),
  langue: z.enum(LANGUES),
  nomA: z.string().trim().max(60),
  nomB: z.string().trim().max(60),
  date: z.string().max(10),
  lieu: z.string().trim().max(160),
}).strict();
export type RedactionInput = z.infer<typeof redactionSchema>;

export const paletteSchema = z.object({ ambiance: z.string().trim().min(2, "Describe the mood in a few words.").max(120) }).strict();

export const paletteResultatSchema = z.object({ fond: couleur, principale: couleur, secondaire: couleur }).strict();
export type Palette = z.infer<typeof paletteResultatSchema>;

/** Admin: price of the editor, typed in TND excl. VAT. */
export const prixInvitationSchema = z.object({
  prixHT: z.coerce.number().positive("The price must be greater than 0.").max(100_000),
  tva: z.coerce.number().min(0).max(100),
}).strict();
