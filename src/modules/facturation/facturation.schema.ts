import { z } from "zod";
import { Types } from "mongoose";
import { MODES_HORS_LIGNE, MODES_PAIEMENT, PLANS_PAIEMENT } from "./facturation.types";

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid identifier");

export const ligneDevisSchema = z.object({
  designation: z.string().trim().min(1, "Describe the service.").max(200),
  quantite: z.number().int().positive(),
  prixUnitaireHT: z.number().int().nonnegative(),
}).strict();

export const devisInputSchema = z.object({
  client: objectId,
  seance: objectId,
  lignes: z.array(ligneDevisSchema).min(1).max(100),
  remise: z.number().min(0).max(100),
  tva: z.number().min(0).max(100),
  devise: z.literal("TND").default("TND"),
  tauxAcompte: z.number().min(0).max(100).default(30),
  dateEmission: z.coerce.date(),
  dateValidite: z.coerce.date(),
  commentaire: z.string().trim().max(2000).optional(),
  genereParIA: z.boolean().default(false),
}).strict().refine((value) => value.dateValidite > value.dateEmission, {
  path: ["dateValidite"],
  message: "Validity date must be after issue date.",
});

export type DevisInput = z.infer<typeof devisInputSchema>;

export const devisIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid quote identifier");

/** Form payload: the amount is typed in TND and converted to millimes by the action. */
export const paiementFormSchema = z.object({
  montant: z.number().positive("The amount must be greater than 0."),
  date: z.coerce.date(),
  modePaiement: z.enum(MODES_PAIEMENT),
  reference: z.string().trim().max(120).optional(),
}).strict();

export type PaiementInput = Omit<z.infer<typeof paiementFormSchema>, "montant"> & { montant: number };

/** Client portal: accept (with the chosen payment plan and method) or decline a quote. */
export const reponseDevisSchema = z.discriminatedUnion("accept", [
  z.object({ accept: z.literal(true), planPaiement: z.enum(PLANS_PAIEMENT), modePaiement: z.enum(MODES_PAIEMENT) }).strict(),
  z.object({ accept: z.literal(false) }).strict(),
]);

export type ReponseDevis = z.infer<typeof reponseDevisSchema>;

/** Client: payment made outside the platform, declared with its proof. Amount typed in TND. */
export const declarationFormSchema = z.object({
  montant: z.coerce.number().positive("The amount must be greater than 0."),
  date: z.coerce.date(),
  modePaiement: z.enum(MODES_HORS_LIGNE),
  reference: z.string().trim().max(120).optional().transform((v) => v || undefined),
  commentaire: z.string().trim().max(500).optional().transform((v) => v || undefined),
});

export type DeclarationInput = Omit<z.infer<typeof declarationFormSchema>, "montant"> & { montant: number };

export const rejetDeclarationSchema = z.object({
  motif: z.string().trim().min(5, "Explain why in a few words.").max(500),
});
