/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * Zod schemas shared by the forms (client) and the Server Actions (server).
 */
import { z } from "zod";
import { CATEGORIES_MATERIEL, ETATS_MATERIEL } from "./materiel.types";

const DAY = 86_400_000;

export const objectIdSchema = (label: string) =>
  z.string().regex(/^[a-f\d]{24}$/i, `${label} is invalid`);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const materielSchema = z.object({
  nom: z.string().trim().min(2, "At least 2 characters").max(80, "80 characters maximum"),
  categorie: z.enum(CATEGORIES_MATERIEL, { error: "Choose a category" }),
  marque: z.string().trim().min(1, "Brand is required").max(60, "60 characters maximum"),
  modele: z.string().trim().min(1, "Model is required").max(60, "60 characters maximum"),
  numeroSerie: z
    .string()
    .trim()
    .min(1, "Serial number is required")
    .max(60, "60 characters maximum"),
  etat: z.enum(ETATS_MATERIEL, { error: "Choose a condition" }),
  dateAchat: z
    .string()
    .min(1, "Purchase date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Purchase date is invalid")
    // One day of tolerance so "today" is accepted whatever the time zone.
    .refine((v) => Date.parse(v) <= Date.now() + DAY, "Purchase date cannot be in the future"),
  prix: z
    .number({ error: "Enter a price" })
    .min(0, "Price cannot be negative")
    .max(1_000_000, "Too large"),
  disponible: z.boolean(),
  photo: z
    .string()
    .trim()
    .max(500, "500 characters maximum")
    .refine((v) => v === "" || isHttpUrl(v), "Enter a valid image URL (https://…)"),
});
export type MaterielInput = z.infer<typeof materielSchema>;
