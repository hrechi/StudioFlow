import { z } from "zod";
import { Types } from "mongoose";

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid identifier");

export const ligneDevisSchema = z.object({
  designation: z.string().trim().min(1).max(200),
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
}).strict().refine((value) => value.dateValidite > value.dateEmission, {
  path: ["dateValidite"],
  message: "Validity date must be after issue date.",
});

export type DevisInput = z.infer<typeof devisInputSchema>;

export const devisIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid quote identifier");
