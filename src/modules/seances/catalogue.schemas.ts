/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Zod schemas shared by the forms (client) and the Server Actions (server).
 */
import { z } from "zod";
import { PACKS_MAX_PLAFOND, STATUTS_PACK } from "./catalogue.types";

export const objectIdSchema = (label: string) =>
  z.string().regex(/^[a-f\d]{24}$/i, `${label} is invalid`);

// ── Event types ─────────────────────────────────────────────────────────────

export const typeEvenementSchema = z.object({
  nom: z.string().trim().min(2, "At least 2 characters").max(80, "80 characters maximum"),
  description: z.string().trim().max(500, "500 characters maximum"),
  maxPacks: z
    .number({ error: "Enter a number" })
    .int("Whole number required")
    .min(1, "At least 1 pack")
    .max(PACKS_MAX_PLAFOND, `${PACKS_MAX_PLAFOND} packs maximum`),
  actif: z.boolean(),
});
export type TypeEvenementInput = z.infer<typeof typeEvenementSchema>;

// ── Services (prestations) ──────────────────────────────────────────────────

export const prestationSchema = z.object({
  nom: z.string().trim().min(2, "At least 2 characters").max(80, "80 characters maximum"),
  description: z.string().trim().max(300, "300 characters maximum"),
  unite: z.string().trim().max(30, "30 characters maximum"),
  actif: z.boolean(),
});
export type PrestationInput = z.infer<typeof prestationSchema>;

// ── Packs ───────────────────────────────────────────────────────────────────

const ligneSchema = z.object({
  prestationId: z.string().min(1, "Choose a service").pipe(objectIdSchema("Service")),
  quantite: z
    .number({ error: "Enter a quantity" })
    .int("Whole number required")
    .min(1, "At least 1")
    .max(10_000, "Too large"),
  conditions: z.string().trim().max(200, "200 characters maximum"),
});

const optionSchema = z.object({
  nom: z.string().trim().min(1, "Name is required").max(80, "80 characters maximum"),
  prix: z.number({ error: "Enter a price" }).min(0, "Price cannot be negative").max(1_000_000),
  description: z.string().trim().max(200, "200 characters maximum"),
});

export const packSchema = z.object({
  nom: z.string().trim().min(2, "At least 2 characters").max(80, "80 characters maximum"),
  typeEvenementId: z.string().min(1, "Choose an event type").pipe(objectIdSchema("Event type")),
  description: z.string().trim().max(1000, "1000 characters maximum"),
  prix: z.number({ error: "Enter a price" }).min(0, "Price cannot be negative").max(1_000_000),
  afficherPrix: z.boolean(),
  dureeEstimeeMinutes: z
    .number({ error: "Enter a number (0 = not specified)" })
    .int("Whole number required")
    .min(0)
    .max(1440, "24 hours maximum"),
  statut: z.enum(STATUTS_PACK, { error: "Invalid status" }),
  prestations: z
    .array(ligneSchema)
    .max(20, "20 services maximum")
    .refine(
      (lines) => new Set(lines.map((l) => l.prestationId)).size === lines.length,
      "Each service can only appear once",
    ),
  options: z.array(optionSchema).max(10, "10 options maximum"),
});
export type PackInput = z.infer<typeof packSchema>;

export const packStatutSchema = z.enum(STATUTS_PACK, { error: "Invalid status" });
