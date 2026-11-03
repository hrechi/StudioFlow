/**
 * Module : Gestion des Invitations.
 * Views shared by the server and the browser, plus the labels of the editor.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { ChampLie, ContenuInvitation, Langue, Ton } from "./invitation.schema";

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

export const DECORATIONS = [
  { src: "/invitations/decorations/flower-rose.svg", label: "Rose", groupe: "Flowers" },
  { src: "/invitations/decorations/flower-corner.svg", label: "Corner flowers", groupe: "Flowers" },
  { src: "/invitations/decorations/leaf-branch.svg", label: "Branch", groupe: "Flowers" },
  { src: "/invitations/decorations/heart-solid.svg", label: "Heart", groupe: "Hearts" },
  { src: "/invitations/decorations/heart-outline.svg", label: "Outline heart", groupe: "Hearts" },
  { src: "/invitations/decorations/hearts-duo.svg", label: "Two hearts", groupe: "Hearts" },
  { src: "/invitations/decorations/rings.svg", label: "Rings", groupe: "Hearts" },
  { src: "/invitations/decorations/frame-gold.svg", label: "Gold frame", groupe: "Frames" },
  { src: "/invitations/decorations/frame-floral.svg", label: "Floral frame", groupe: "Frames" },
  { src: "/invitations/decorations/frame-arch.svg", label: "Arch", groupe: "Frames" },
  { src: "/invitations/decorations/divider-flourish.svg", label: "Flourish", groupe: "Frames" },
  { src: "/invitations/decorations/divider-dots.svg", label: "Dots", groupe: "Frames" },
] as const;

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
};

export const CLIENT_PATH = "/espace-client/invitations";
export const imageHref = (id: string) => `/api/invitations/images/${id}`;
export const partageHref = (token: string) => `/invitation/${token}`;
