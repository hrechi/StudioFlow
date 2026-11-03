import { z } from "zod";
import {
  CATEGORIES_RECLAMATION,
  SENTIMENTS,
  STATUTS_AVIS,
  STATUTS_RECLAMATION,
  TOPICS_AVIS,
  type CategorieReclamation,
} from "./avis.types";

const optionalId = z.string().trim().min(1).optional().or(z.literal(""));
const text = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const createAvisSchema = z.object({
  note: z.coerce.number().int().min(1).max(5),
  commentaire: text(3000, "Review"),
  seanceId: optionalId,
  seanceTitre: z.string().trim().max(200).optional(),
  seanceType: z.string().trim().max(80).optional(),
});
export type CreateAvisInput = z.infer<typeof createAvisSchema>;

export const createReclamationSchema = z.object({
  objet: text(180, "Subject"),
  description: text(5000, "Description"),
  categorie: z.enum(CATEGORIES_RECLAMATION),
  seanceId: optionalId,
  seanceTitre: z.string().trim().max(200).optional(),
});
export type CreateReclamationInput = z.infer<typeof createReclamationSchema>;

/** The author edits their own review (it goes back to moderation). */
export const updateOwnAvisSchema = z.object({
  id: z.string().min(1),
  note: z.coerce.number().int().min(1).max(5),
  commentaire: text(3000, "Review"),
});
export type UpdateOwnAvisInput = z.infer<typeof updateOwnAvisSchema>;

/** The author edits their own complaint (only while it is still open). */
export const updateOwnReclamationSchema = z.object({
  id: z.string().min(1),
  objet: text(180, "Subject"),
  description: text(5000, "Description"),
  categorie: z.enum(CATEGORIES_RECLAMATION),
});
export type UpdateOwnReclamationInput = z.infer<typeof updateOwnReclamationSchema>;

export const feedbackIdSchema = z.object({ id: z.string().min(1) });

export const moderateAvisSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(STATUTS_AVIS),
});

export const repondreAvisSchema = z.object({
  id: z.string().min(1),
  reponse: text(3000, "Reply"),
});

export const updateReclamationSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(STATUTS_RECLAMATION),
  reponse: z.string().trim().max(5000).optional(),
});

export const generateReplySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["avis", "reclamation"]),
});

export const analyticsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  topic: z.enum(TOPICS_AVIS).optional(),
  q: z.string().trim().max(100).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ComplaintCategory = CategorieReclamation;
