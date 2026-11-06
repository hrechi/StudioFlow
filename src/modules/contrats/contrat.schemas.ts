/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Schémas Zod pour la validation des Server Actions.
 */
import { z } from "zod";

// ── Création ─────────────────────────────────────────────────────────────────

export const champsContratSchema = z.object({
  nomClient: z.string().trim().min(1, "Required").max(200),
  emailClient: z.string().trim().email("Invalid email").max(200),
  dateSeance: z.string().trim().optional(),
  lieuSeance: z.string().trim().max(300).optional(),
  prestations: z.string().trim().min(1, "Required").max(2000),
  montantTTC: z.number().min(0).optional(),
  conditionsAnnulation: z.string().trim().max(1000).optional(),
  delaiLivraison: z.string().trim().max(500).optional(),
  clausesSupplementaires: z.string().trim().max(3000).optional(),
});

export const creerContratSchema = z.discriminatedUnion("modeCreation", [
  z.object({
    modeCreation: z.literal("CHAMPS"),
    titre: z.string().trim().min(1, "Required").max(200),
    clientId: z.string().min(1, "Required"),
    champs: champsContratSchema,
  }),
  z.object({
    modeCreation: z.literal("LIBRE"),
    titre: z.string().trim().min(1, "Required").max(200),
    clientId: z.string().min(1, "Required"),
    texteLibre: z.string().trim().min(10, "Minimum 10 characters").max(20000),
  }),
  z.object({
    modeCreation: z.literal("UPLOAD"),
    titre: z.string().trim().min(1, "Required").max(200),
    clientId: z.string().min(1, "Required"),
    // Le fichier PDF est transmis séparément via FormData
  }),
]);

export type CreerContratInput = z.infer<typeof creerContratSchema>;

// ── Mise à jour ───────────────────────────────────────────────────────────────

export const mettreAJourContratSchema = z.object({
  titre: z.string().trim().min(1).max(200).optional(),
  clientId: z.string().min(1).optional(),
  champs: champsContratSchema.partial().optional(),
  texteLibre: z.string().trim().max(20000).optional(),
});

// ── Envoi / réponse ───────────────────────────────────────────────────────────

export const contratIdSchema = z.string().min(1, "Required");

export const reponsClientSchema = z.object({
  accepter: z.boolean(),
  motifRefus: z.string().trim().max(500).optional(),
  clientWallet: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum address")
    .optional(),
});

export type ReponseClientInput = z.infer<typeof reponsClientSchema>;

// ── Révocation ────────────────────────────────────────────────────────────────

export const revoquerContratSchema = z.object({
  raison: z.string().trim().min(1, "Required").max(500),
});
