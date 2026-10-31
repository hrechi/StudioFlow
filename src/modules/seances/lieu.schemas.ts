/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Zod schema of the location form, shared by the form (client) and the Server Actions (server).
 * Coordinates are typed as text ("" = not set) so an empty input is not read as 0.
 */
import { z } from "zod";
import { objectIdSchema } from "./catalogue.schemas";
import { lireCoordonnee, verifierAlternatives } from "./lieu.rules";
import { LIEUX_ALTERNATIFS_MAX, TYPES_LIEU } from "./lieu.types";

const coordinate = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => lireCoordonnee(v, min, max) !== "invalid", `${label} must be between ${min} and ${max}`);

export const lieuSchema = z
  .object({
    nom: z.string().trim().min(2, "At least 2 characters").max(80, "80 characters maximum"),
    adresse: z.string().trim().min(2, "Enter an address").max(200, "200 characters maximum"),
    description: z.string().trim().max(500, "500 characters maximum"),
    type: z.enum(TYPES_LIEU, { error: "Invalid type" }),
    exterieur: z.boolean(),
    capacite: z
      .number({ error: "Enter a number (0 = not specified)" })
      .int("Whole number required")
      .min(0, "Cannot be negative")
      .max(10_000, "Too large"),
    disponible: z.boolean(),
    latitude: coordinate(-90, 90, "Latitude"),
    longitude: coordinate(-180, 180, "Longitude"),
    coutSupplementaire: z
      .number({ error: "Enter an amount (0 = none)" })
      .min(0, "Cannot be negative")
      .max(100_000, "Too large"),
    lieuxAlternatifsIds: z
      .array(objectIdSchema("Location"))
      .max(LIEUX_ALTERNATIFS_MAX, `${LIEUX_ALTERNATIFS_MAX} alternatives maximum`),
  })
  .superRefine((v, ctx) => {
    const hasLat = v.latitude.trim() !== "";
    const hasLng = v.longitude.trim() !== "";
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: "custom",
        path: [hasLat ? "longitude" : "latitude"],
        message: "Enter both latitude and longitude, or neither",
      });
    }
    const alt = verifierAlternatives(v.lieuxAlternatifsIds);
    if (!alt.ok) ctx.addIssue({ code: "custom", path: ["lieuxAlternatifsIds"], message: alt.message });
  });
export type LieuInput = z.infer<typeof lieuSchema>;
