/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * Zod schemas for equipment reservations (forms + Server Actions).
 */
import { z } from "zod";
import { objectIdSchema } from "./materiel.schemas";

const isoDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} is invalid`);

/** One or more items for one séance over the same period. */
export const reservationsSchema = z
  .object({
    seanceId: z.string().min(1, "Choose a session").pipe(objectIdSchema("Session")),
    materielIds: z
      .array(objectIdSchema("Equipment"))
      .min(1, "Choose at least one item")
      .max(20, "20 items maximum per reservation"),
    dateDebut: isoDate("Start"),
    dateFin: isoDate("End"),
  })
  .refine((v) => Date.parse(v.dateFin) > Date.parse(v.dateDebut), {
    path: ["dateFin"],
    message: "The end must be after the start",
  });
export type ReservationsInput = z.infer<typeof reservationsSchema>;

/** Return after use: the condition can only stay good or become worn. */
export const ETATS_RETOUR = ["BON", "USE"] as const;
export const retourSchema = z.object({
  etat: z.enum(ETATS_RETOUR, { error: "Choose the condition" }),
  remarque: z.string().trim().max(500, "500 characters maximum"),
});
export type RetourInput = z.infer<typeof retourSchema>;

export const panneSchema = z.object({
  description: z
    .string()
    .trim()
    .min(5, "Describe the problem (5 characters minimum)")
    .max(500, "500 characters maximum"),
});
export type PanneInput = z.infer<typeof panneSchema>;
