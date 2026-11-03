/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Zod schemas of the weather settings and decisions, shared by the forms and the Server Actions.
 */
import { z } from "zod";
import { objectIdSchema } from "./catalogue.schemas";

const nombre = (label: string, min: number, max: number, entier = false) => {
  const base = z.number({ error: `Enter ${label}` }).min(min, `At least ${min}`).max(max, `${max} at most`);
  return entier ? base.int("Whole number required") : base;
};

export const seuilsMeteoSchema = z
  .object({
    actif: z.boolean(),
    pluieProbabiliteMax: nombre("a percentage", 0, 100),
    pluieMmMax: nombre("an amount in mm", 0, 200),
    ventKmhMax: nombre("a speed in km/h", 0, 200),
    temperatureMinC: nombre("a temperature", -30, 60),
    temperatureMaxC: nombre("a temperature", -30, 60),
    horizonJours: nombre("a number of days", 1, 14, true),
  })
  .superRefine((v, ctx) => {
    if (v.temperatureMinC >= v.temperatureMaxC) {
      ctx.addIssue({
        code: "custom",
        path: ["temperatureMinC"],
        message: "The low limit must be below the high limit",
      });
    }
  });
export type SeuilsMeteoInput = z.infer<typeof seuilsMeteoSchema>;

export const alerteIdSchema = objectIdSchema("Alert");

export const reportMeteoSchema = z.object({
  alerteId: alerteIdSchema,
  dateDebut: z
    .string()
    .min(1, "Choose a date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date is invalid"),
});

export const lieuAlternatifMeteoSchema = z.object({
  alerteId: alerteIdSchema,
  lieuId: objectIdSchema("Location"),
});
