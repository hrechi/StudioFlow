/**
 * Module : Gestion des Invitations.
 * Views shared by the server and the browser, plus the labels of the editor.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type {
  AMBIANCES,
  BOUCLES,
  ChampLie,
  ContenuInvitation,
  EASINGS,
  Entree,
  FILTRES,
  Langue,
  MASQUES,
  OUVERTURES,
  PisteMusique,
  Ton,
  TypeElement,
  UNITES_COMPTE,
} from "./invitation.schema";

/**
 * Where the client stands. Never stored: it is read from the invitation quote and its invoice, so
 * whatever way the money arrives (proof confirmed by the admin, payment recorded at the desk,
 * online checkout), the editor unlocks from the same fact.
 */
export const ETATS_ACCES = [
  "VERROUILLE",
  "DEVIS_A_ACCEPTER",
  "FACTURE_A_EMETTRE",
  "FACTURE_A_PAYER",
  "PREUVE_EN_VERIFICATION",
  "DEBLOQUE",
] as const;
export type EtatAcces = (typeof ETATS_ACCES)[number];

export type AccesInvitation = {
  etat: EtatAcces;
  /** Current price, shown before any quote exists (TND incl. VAT). */
  prixTTC: number;
  devisId?: string;
  devisNumero?: string;
  /** What remains on the invoice (TND). */
  restant?: number;
  debloqueLe?: string;
};

export const etatAccesConfig: StatusConfig<EtatAcces> = {
  VERROUILLE: { label: "Locked", tone: "neutral" },
  DEVIS_A_ACCEPTER: { label: "Quote to accept", tone: "info" },
  FACTURE_A_EMETTRE: { label: "Invoice to issue", tone: "warning" },
  FACTURE_A_PAYER: { label: "Waiting for payment", tone: "warning" },
  PREUVE_EN_VERIFICATION: { label: "Proof under review", tone: "warning" },
  DEBLOQUE: { label: "Unlocked", tone: "success" },
};

export type InvitationResume = {
  id: string;
  titre: string;
  contenu: ContenuInvitation;
  partageActif: boolean;
  updatedAt: string;
};

export type InvitationView = InvitationResume & { partageToken?: string };

export type ParametresInvitationView = { prixHT: number; tva: number; prixTTC: number };

/** One row of the admin's overview: a client who asked for the editor. */
export type AccesClientView = {
  devisId: string;
  devisNumero: string;
  client: string;
  etat: EtatAcces;
  montantTTC: number;
  restant: number;
  debloqueLe?: string;
  invitations: number;
};

export const MAX_INVITATIONS = 30;
export const MAX_IMAGES = 60;
export const IMAGE_TAILLE_MAX = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PRIX_HT_PAR_DEFAUT = 50; // TND, until the admin sets the real price
export const TVA_INVITATION_PAR_DEFAUT = 19;
export const TITRE_DEVIS_INVITATION = "Wedding invitation editor";
export const TYPE_DEVIS_INVITATION = "Invitation editor";

export const FORMATS_CARTE = [
  { id: "a5", label: "A5 portrait", width: 420, height: 595 },
  { id: "a5-paysage", label: "A5 landscape", width: 595, height: 420 },
  { id: "carre", label: "Square", width: 500, height: 500 },
  { id: "5x7", label: "5 × 7 in", width: 360, height: 504 },
] as const;

const deco = (fichier: string, label: string, groupe: GroupeDecoration) => ({ src: `/invitations/decorations/${fichier}.svg`, label, groupe });

export const GROUPES_DECORATION = ["Flowers", "Hearts", "Frames", "Party", "Baby", "Graduation", "Traditions", "Business", "Home"] as const;
export type GroupeDecoration = (typeof GROUPES_DECORATION)[number];

/** Bundled decorations (public/invitations/decorations), all original drawings. */
export const DECORATIONS = [
  deco("flower-rose", "Rose", "Flowers"),
  deco("flower-corner", "Corner flowers", "Flowers"),
  deco("leaf-branch", "Branch", "Flowers"),
  deco("laurel", "Laurel", "Flowers"),
  deco("heart-solid", "Heart", "Hearts"),
  deco("heart-outline", "Outline heart", "Hearts"),
  deco("hearts-duo", "Two hearts", "Hearts"),
  deco("rings", "Rings", "Hearts"),
  deco("diamond-ring", "Engagement ring", "Hearts"),
  deco("champagne", "Champagne", "Hearts"),
  deco("frame-gold", "Gold frame", "Frames"),
  deco("frame-floral", "Floral frame", "Frames"),
  deco("frame-arch", "Arch", "Frames"),
  deco("geometric-corner", "Geometric corner", "Frames"),
  deco("divider-flourish", "Flourish", "Frames"),
  deco("divider-dots", "Dots", "Frames"),
  deco("balloons", "Balloons", "Party"),
  deco("confetti", "Confetti", "Party"),
  deco("cake", "Cake", "Party"),
  deco("gift", "Gift", "Party"),
  deco("party-hat", "Party hat", "Party"),
  deco("star-sparkle", "Sparkles", "Party"),
  deco("baby-rattle", "Rattle", "Baby"),
  deco("baby-footprints", "Footprints", "Baby"),
  deco("cloud-moon", "Moon and cloud", "Baby"),
  deco("graduation-cap", "Graduation cap", "Graduation"),
  deco("diploma", "Diploma", "Graduation"),
  deco("mandala", "Mandala", "Traditions"),
  deco("henna-hand", "Henna hand", "Traditions"),
  deco("lantern", "Lantern", "Traditions"),
  deco("crescent-star", "Crescent and star", "Traditions"),
  deco("microphone", "Microphone", "Business"),
  deco("lightbulb", "Light bulb", "Business"),
  deco("house", "House", "Home"),
  deco("house-key", "Key", "Home"),
];

export const langueLabels: Record<Langue, string> = { fr: "Français", en: "English", ar: "العربية" };

export const tonLabels: Record<Ton, string> = {
  ELEGANT: "Elegant",
  ROMANTIQUE: "Romantic",
  JOYEUX: "Joyful",
  SIMPLE: "Simple",
};

export const champLieLabels: Record<ChampLie, string> = {
  noms: "Both names",
  nomA: "First name",
  nomB: "Second name",
  date: "Date",
  heure: "Time",
  lieu: "Venue",
  message: "Message",
  titre: "Title",
  hotes: "Hosts",
  tenue: "Dress code",
  contact: "Contact",
  adresse: "Address",
};

export const typeElementLabels: Record<TypeElement, string> = {
  text: "Text",
  image: "Image",
  shape: "Shape",
  qrcode: "QR code",
  countdown: "Countdown",
};

export const entreeLabels: Record<Entree, string> = {
  AUCUNE: "None",
  FONDU: "Fade in",
  GLISSEMENT_HAUT: "Slide up",
  GLISSEMENT_BAS: "Slide down",
  GLISSEMENT_GAUCHE: "Slide from the right",
  GLISSEMENT_DROITE: "Slide from the left",
  ZOOM: "Zoom",
  REVELATION: "Reveal",
  MACHINE_A_ECRIRE: "Typewriter",
};

export const boucleLabels: Record<(typeof BOUCLES)[number], string> = {
  AUCUNE: "None",
  FLOTTEMENT: "Float",
  SCINTILLEMENT: "Twinkle",
  PULSATION: "Pulse",
};

export const easingLabels: Record<(typeof EASINGS)[number], string> = {
  LINEAIRE: "Linear",
  DOUCE: "Smooth",
  ENTREE: "Slow start",
  SORTIE: "Slow end",
  REBOND: "Bounce",
};

export const ouvertureLabels: Record<(typeof OUVERTURES)[number], string> = {
  ENVELOPPE: "Envelope",
  SCEAU: "Wax seal",
  RIDEAU: "Curtain",
  CADEAU: "Gift box",
};

export const ambianceLabels: Record<(typeof AMBIANCES)[number], string> = {
  PETALES: "Petals",
  CONFETTIS: "Confetti",
  BALLONS: "Balloons",
  ETINCELLES: "Sparkles",
  LANTERNES: "Lanterns",
};

export const masqueLabels: Record<(typeof MASQUES)[number], string> = { CERCLE: "Circle", ARCHE: "Arch", COEUR: "Heart" };
export const filtreLabels: Record<(typeof FILTRES)[number], string> = { NOIR_BLANC: "Black & white", SEPIA: "Sepia", DOUX: "Soft", CHAUD: "Warm" };
export const unitesCompteLabels: Record<(typeof UNITES_COMPTE)[number], string> = {
  JOURS: "Days",
  JOURS_HEURES: "Days and hours",
  COMPLET: "Days, hours, minutes, seconds",
};

/**
 * Music library. The files are not shipped: drop royalty-free MP3s in public/invitations/musique
 * with these names (see the README there). A track without its file is simply not offered.
 */
export const MUSIQUES: Record<PisteMusique, { titre: string; fichier: string }> = {
  "piano-doux": { titre: "Soft piano", fichier: "/invitations/musique/piano-doux.mp3" },
  valse: { titre: "Waltz", fichier: "/invitations/musique/valse.mp3" },
  fete: { titre: "Party", fichier: "/invitations/musique/fete.mp3" },
  oud: { titre: "Oud", fichier: "/invitations/musique/oud.mp3" },
  lounge: { titre: "Lounge", fichier: "/invitations/musique/lounge.mp3" },
  berceuse: { titre: "Lullaby", fichier: "/invitations/musique/berceuse.mp3" },
};

export const CLIENT_PATH = "/espace-client/invitations";
export const imageHref = (id: string) => `/api/invitations/images/${id}`;
/** Link preview (Open Graph) of a shared card. */
export const apercuHref = (token: string) => `/api/invitations/apercu/${token}`;
export const partageHref = (token: string) => `/invitation/${token}`;
