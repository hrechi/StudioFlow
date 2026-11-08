/**
 * Module : Gestion des Invitations.
 * The invitation document. This Zod schema is the single source of truth: the editor, the
 * templates, the database and the public page all read and write this exact shape.
 *
 * Backward compatibility: every field added after the first version is optional. A card saved
 * before (wedding names, no event type, no animation) is still valid as it is; missing values
 * are read with the helpers at the end of this file (no event type = MARIAGE, no animation = none).
 */
import { z } from "zod";
import { contraste } from "./invitation.couleurs";

export const POLICES = [
  "Great Vibes",
  "Playfair Display",
  "Cormorant Garamond",
  "Montserrat",
  "Amiri",
  "Cairo",
  "Dancing Script",
  "Cinzel",
  "Lato",
  "Tajawal",
  "El Messiri",
  "Reem Kufi",
] as const;
export type Police = (typeof POLICES)[number];

/** Fonts that have Arabic letters. The others fall back to Amiri for Arabic text. */
export const POLICES_ARABES: readonly Police[] = ["Amiri", "Cairo", "Tajawal", "El Messiri", "Reem Kufi"];

export const LANGUES = ["fr", "en", "ar"] as const;
export type Langue = (typeof LANGUES)[number];

export const TONS = ["ELEGANT", "ROMANTIQUE", "JOYEUX", "SIMPLE"] as const;
export type Ton = (typeof TONS)[number];

/** Kinds of events. Details for each one (labels, palettes, decorations…) in invitation.evenements.ts. */
export const TYPES_EVENEMENT = [
  "MARIAGE",
  "FIANCAILLES",
  "HENNE",
  "ANNIVERSAIRE",
  "NAISSANCE",
  "REMISE_DIPLOME",
  "ENTREPRISE",
  "CONFERENCE",
  "ANNIVERSAIRE_MARIAGE",
  "FETE_RELIGIEUSE",
  "CREMAILLERE",
] as const;
export type TypeEvenement = (typeof TYPES_EVENEMENT)[number];

/** Form fields a text element of the card can follow (see invitation.linked.ts). */
export const CHAMPS_LIES = [
  "noms",
  "nomA",
  "nomB",
  "date",
  "heure",
  "lieu",
  "message",
  "titre",
  "hotes",
  "tenue",
  "contact",
  "adresse",
] as const;
export type ChampLie = (typeof CHAMPS_LIES)[number];

export const FORMES = ["rect", "ellipse", "line", "heart", "star", "ring", "arch", "frame"] as const;
export type Forme = (typeof FORMES)[number];

// ── Animations ───────────────────────────────────────────────────────────────

export const ENTREES = [
  "AUCUNE",
  "FONDU",
  "GLISSEMENT_HAUT",
  "GLISSEMENT_BAS",
  "GLISSEMENT_GAUCHE",
  "GLISSEMENT_DROITE",
  "ZOOM",
  "REVELATION",
] as const;
/** Texts can also be typed letter by letter. */
export const ENTREES_TEXTE = [...ENTREES, "MACHINE_A_ECRIRE"] as const;
export type Entree = (typeof ENTREES_TEXTE)[number];

export const BOUCLES = ["AUCUNE", "FLOTTEMENT", "SCINTILLEMENT", "PULSATION"] as const;
export type Boucle = (typeof BOUCLES)[number];

export const EASINGS = ["LINEAIRE", "DOUCE", "ENTREE", "SORTIE", "REBOND"] as const;
export type Easing = (typeof EASINGS)[number];

/** Bounds of the animation fields, in seconds. Kept short: a guest opens the card on a phone. */
export const BORNES_ANIMATION = {
  duree: { min: 0.2, max: 6 },
  delai: { min: 0, max: 15 },
  dureeBoucle: { min: 0.6, max: 12 },
} as const;

const animation = <T extends readonly [string, ...string[]]>(types: T) =>
  z.object({
    type: z.enum(types),
    duree: z.number().min(BORNES_ANIMATION.duree.min).max(BORNES_ANIMATION.duree.max),
    delai: z.number().min(BORNES_ANIMATION.delai.min).max(BORNES_ANIMATION.delai.max),
    easing: z.enum(EASINGS),
    boucle: z.enum(BOUCLES),
    dureeBoucle: z.number().min(BORNES_ANIMATION.dureeBoucle.min).max(BORNES_ANIMATION.dureeBoucle.max),
  }).strict();

export const animationSchema = animation(ENTREES);
export const animationTexteSchema = animation(ENTREES_TEXTE);
export type AnimationElement = z.infer<typeof animationTexteSchema>;

export const OUVERTURES = ["ENVELOPPE", "SCEAU", "RIDEAU", "CADEAU"] as const;
export type TypeOuverture = (typeof OUVERTURES)[number];

export const AMBIANCES = ["PETALES", "CONFETTIS", "BALLONS", "ETINCELLES", "LANTERNES"] as const;
export type TypeAmbiance = (typeof AMBIANCES)[number];

/** Music library: the files themselves are added to public/invitations/musique (see its README). */
export const PISTES_MUSIQUE = ["piano-doux", "valse", "fete", "oud", "lounge", "berceuse"] as const;
export type PisteMusique = (typeof PISTES_MUSIQUE)[number];

// ── QR code ──────────────────────────────────────────────────────────────────

/** In card points (72 pt = 1 inch). Under the minimum the code is refused; under the advice, a warning. */
export const QR_TAILLE_MIN = 48;
export const QR_TAILLE_CONSEILLEE = 72;
export const QR_CONTRASTE_MIN = 3;
export const QR_CONTRASTE_CONSEILLE = 4.5;

// ── Shared pieces ────────────────────────────────────────────────────────────

const couleur = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.");
const position = z.number().min(-5000).max(5000);
const dimension = z.number().min(1).max(5000);
const opacite = z.number().min(0).max(1);

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
  /** Layers panel. Absent = visible, unlocked, unnamed, not flipped, not grouped. */
  nom: z.string().trim().max(60).optional(),
  visible: z.boolean().optional(),
  verrouille: z.boolean().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  groupe: z.string().min(1).max(64).optional(),
};

const ombre = z.object({
  color: couleur,
  blur: z.number().min(0).max(40),
  offsetX: z.number().min(-50).max(50),
  offsetY: z.number().min(-50).max(50),
  opacity: opacite,
}).strict();

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
    opacity: opacite,
    bold: z.boolean(),
    italic: z.boolean(),
    letterSpacing: z.number().min(0).max(40),
    lineHeight: z.number().min(0.8).max(3).optional(),
    majuscules: z.boolean().optional(),
    ombre: ombre.optional(),
    contour: z.object({ color: couleur, width: z.number().min(0).max(20) }).strict().optional(),
    /** Curved text: 0 = straight, positive bends like a smile, negative like an arch. */
    courbe: z.number().min(-100).max(100).optional(),
  }).strict(),
  animation: animationTexteSchema.optional(),
}).strict();

export const MASQUES = ["CERCLE", "ARCHE", "COEUR"] as const;
export type Masque = (typeof MASQUES)[number];
export const FILTRES = ["NOIR_BLANC", "SEPIA", "DOUX", "CHAUD"] as const;
export type Filtre = (typeof FILTRES)[number];

const elementImage = z.object({
  ...baseElement,
  type: z.literal("image"),
  src: sourceImage,
  style: z.object({
    opacity: opacite,
    masque: z.enum(MASQUES).optional(),
    cadre: z.object({ color: couleur, width: z.number().min(0).max(30) }).strict().optional(),
    filtre: z.enum(FILTRES).optional(),
  }).strict(),
  animation: animationSchema.optional(),
}).strict();

const elementForme = z.object({
  ...baseElement,
  type: z.literal("shape"),
  shape: z.enum(FORMES),
  style: z.object({
    fill: couleur.nullable(),
    stroke: couleur.nullable(),
    strokeWidth: z.number().min(0).max(60),
    opacity: opacite,
    degrade: z.object({
      type: z.enum(["LINEAIRE", "RADIAL"]),
      de: couleur,
      a: couleur,
      angle: z.number().min(0).max(360),
    }).strict().optional(),
    cornerRadius: z.number().min(0).max(500).optional(),
    /** Thickness of a ring or a frame, in points. */
    epaisseur: z.number().min(1).max(250).optional(),
  }).strict(),
  animation: animationSchema.optional(),
}).strict();

/**
 * QR code pointing to the venue (Google Maps). Dark modules on a light background, with enough
 * contrast and a quiet zone, or phones cannot read it: the schema refuses anything weaker.
 */
const elementQr = z.object({
  ...baseElement,
  type: z.literal("qrcode"),
  cible: z.enum(["CARTE"]),
  width: z.number().min(QR_TAILLE_MIN).max(1000),
  height: z.number().min(QR_TAILLE_MIN).max(1000),
  style: z.object({
    couleur,
    fond: couleur,
    /** Quiet zone, in modules (the standard asks for 4; 2 is the lowest most readers accept). */
    marge: z.number().int().min(2).max(8),
    opacity: z.number().min(0.85).max(1),
  }).strict(),
  animation: animationSchema.optional(),
}).strict().superRefine((qr, ctx) => {
  if (contraste(qr.style.couleur, qr.style.fond) < QR_CONTRASTE_MIN) {
    ctx.addIssue({ code: "custom", path: ["style", "couleur"], message: "The QR code needs more contrast with its background." });
  }
});

export const UNITES_COMPTE = ["JOURS", "JOURS_HEURES", "COMPLET"] as const;
export type UnitesCompte = (typeof UNITES_COMPTE)[number];

/** Countdown to the date and time of the event. Printed files show the date itself instead. */
const elementCompte = z.object({
  ...baseElement,
  type: z.literal("countdown"),
  style: z.object({
    fontFamily: z.enum(POLICES),
    fontSize: z.number().min(8).max(120),
    color: couleur,
    fond: couleur.nullable(),
    opacity: opacite,
    unites: z.enum(UNITES_COMPTE),
  }).strict(),
  animation: animationSchema.optional(),
}).strict();

export const elementSchema = z.discriminatedUnion("type", [elementTexte, elementImage, elementForme, elementQr, elementCompte]);
export type ElementInvitation = z.infer<typeof elementSchema>;
export type ElementTexte = z.infer<typeof elementTexte>;
export type ElementImage = z.infer<typeof elementImage>;
export type ElementForme = z.infer<typeof elementForme>;
export type ElementQr = z.infer<typeof elementQr>;
export type ElementCompte = z.infer<typeof elementCompte>;
export type TypeElement = ElementInvitation["type"];

export const coordonneesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).strict();
export type Coordonnees = z.infer<typeof coordonneesSchema>;

/**
 * Empty strings are allowed while a draft is being filled in; only a real date or time is checked.
 * nomA / nomB are the people the event is for (couple, guest of honour, company…): each event type
 * gives them its own label. The other fields are optional and shown only by the types that use them.
 */
export const detailsSchema = z.object({
  nomA: z.string().trim().max(60),
  nomB: z.string().trim().max(60),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Choose a valid date."),
  heure: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Choose a valid time."),
  lieu: z.string().trim().max(160),
  message: z.string().trim().max(600),
  langue: z.enum(LANGUES),
  titre: z.string().trim().max(120).optional(),
  hotes: z.string().trim().max(160).optional(),
  tenue: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(160).optional(),
  /** Street address, used for the map link when there are no coordinates. */
  adresse: z.string().trim().max(240).optional(),
  coordonnees: coordonneesSchema.optional(),
}).strict();
export type DetailsInvitation = z.infer<typeof detailsSchema>;

export const ouvertureSchema = z.object({ type: z.enum(OUVERTURES), couleur }).strict();
export const ambianceSchema = z.object({ type: z.enum(AMBIANCES), densite: z.number().int().min(1).max(3) }).strict();
export const musiqueSchema = z.object({ piste: z.enum(PISTES_MUSIQUE), volume: z.number().min(0.05).max(1) }).strict();

export const contenuSchema = z.object({
  size: z.object({ width: z.number().min(200).max(1000), height: z.number().min(200).max(1000) }).strict(),
  background: z.object({ color: couleur, image: sourceImage.optional() }).strict(),
  elements: z.array(elementSchema).max(150, "An invitation can hold up to 150 elements."),
  details: detailsSchema,
  /** Absent on cards made before event types existed: those are weddings. */
  typeEvenement: z.enum(TYPES_EVENEMENT).optional(),
  /** Public page only: how the card opens, the particles around it, and the music. */
  ouverture: ouvertureSchema.optional(),
  ambiance: ambianceSchema.optional(),
  musique: musiqueSchema.optional(),
}).strict();
export type ContenuInvitation = z.infer<typeof contenuSchema>;

export const titreSchema = z.string().trim().min(1, "Give your invitation a name.").max(80);

export const saveInvitationSchema = z.object({ titre: titreSchema, contenu: contenuSchema }).strict();

export const createInvitationSchema = z.object({
  titre: titreSchema,
  templateId: z.string().min(1).max(40),
  /** Language chosen in the creation dialog; absent = the language of the template. */
  langue: z.enum(LANGUES).optional(),
}).strict();

export const redactionSchema = z.object({
  ton: z.enum(TONS),
  langue: z.enum(LANGUES),
  nomA: z.string().trim().max(60),
  nomB: z.string().trim().max(60),
  date: z.string().max(10),
  lieu: z.string().trim().max(160),
  typeEvenement: z.enum(TYPES_EVENEMENT).optional(),
  titre: z.string().trim().max(120).optional(),
  hotes: z.string().trim().max(160).optional(),
}).strict();
export type RedactionInput = z.infer<typeof redactionSchema>;

export const paletteSchema = z.object({
  ambiance: z.string().trim().min(2, "Describe the mood in a few words.").max(120),
  typeEvenement: z.enum(TYPES_EVENEMENT).optional(),
}).strict();

export const paletteResultatSchema = z.object({ fond: couleur, principale: couleur, secondaire: couleur }).strict();
export type Palette = z.infer<typeof paletteResultatSchema>;

/** Admin: price of the editor, typed in TND excl. VAT. */
export const prixInvitationSchema = z.object({
  prixHT: z.coerce.number().positive("The price must be greater than 0.").max(100_000),
  tva: z.coerce.number().min(0).max(100),
}).strict();

// ── Reading old cards ────────────────────────────────────────────────────────

export const typeDe = (contenu: Pick<ContenuInvitation, "typeEvenement">): TypeEvenement => contenu.typeEvenement ?? "MARIAGE";

export const estVisible = (element: ElementInvitation) => element.visible !== false;
