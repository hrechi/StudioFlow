import { z } from "zod";
import { objectIdSchema } from "./catalogue.schemas";
import { ROLES_EQUIPE, STATUTS_INITIAUX, STATUTS_SEANCE_REEL } from "./seance.dto";

const isoDate = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .min(1, `${label} is required`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} is invalid`);

export const seanceSchema = z
  .object({
    titre: z.string().trim().min(2, "At least 2 characters").max(120, "120 characters maximum"),
    clientId: z.string().refine((v) => v === "" || /^[a-f\d]{24}$/i.test(v), "Client is invalid"),
    clientNom: z.string().trim().max(80, "80 characters maximum"),
    clientTelephone: z.string().trim().max(30, "30 characters maximum"),
    clientEmail: z
      .string()
      .trim()
      .max(120, "120 characters maximum")
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email is invalid"),
    typeEvenementId: z.string().min(1, "Choose an event type").pipe(objectIdSchema("Event type")),
    packId: z.string(),
    prestationPersonnalisee: z.string().trim().max(500, "500 characters maximum"),
    dateDebut: isoDate("Start"),
    dateFin: isoDate("End"),
    lieu: z.string().trim().min(2, "Location is required").max(200, "200 characters maximum"),
    /** Configured location ID: when set, the server uses its name and ignores the free-text `lieu`. */
    lieuId: z
      .string()
      .refine((v) => v === "" || /^[a-f\d]{24}$/i.test(v), "Location is invalid")
      .optional(),
    statut: z.enum(STATUTS_INITIAUX as unknown as [string, ...string[]], { error: "Invalid status" }).optional(),
    equipe: z
      .array(
        z.object({
          employeId: z.string().min(1, "Choose an employee").pipe(objectIdSchema("Employee")),
          role: z.enum(ROLES_EQUIPE, { error: "Choose a role" }),
        }),
      )
      .max(12, "12 team members maximum")
      .refine(
        (team) => new Set(team.map((m) => m.employeId)).size === team.length,
        "An employee can only appear once per session",
      ),
    notes: z.string().trim().max(1000, "1000 characters maximum"),
  })
  .superRefine((v, ctx) => {
    if (!v.clientId) {
      if (v.clientNom.length < 2) {
        ctx.addIssue({ code: "custom", path: ["clientNom"], message: "Choose a client account, or enter the client's name" });
      }
      if (v.clientTelephone.replace(/\D/g, "").length < 6) {
        ctx.addIssue({ code: "custom", path: ["clientTelephone"], message: "Enter a phone number" });
      }
    }
    if (v.packId && !/^[a-f\d]{24}$/i.test(v.packId)) {
      ctx.addIssue({ code: "custom", path: ["packId"], message: "Pack is invalid" });
    }
    if (!v.packId && v.prestationPersonnalisee.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["prestationPersonnalisee"],
        message: "Choose a pack or describe the custom service",
      });
    }
    if (Date.parse(v.dateFin) <= Date.parse(v.dateDebut)) {
      ctx.addIssue({ code: "custom", path: ["dateFin"], message: "End must be after the start" });
    }
  });
export type SeanceInput = z.infer<typeof seanceSchema>;

export const seanceStatutSchema = z.enum(STATUTS_SEANCE_REEL, { error: "Invalid status" });

export const prixFinalSchema = z
  .number({ error: "Le prix doit être un nombre" })
  .min(0, "Le prix ne peut pas être négatif")
  .max(100_000, "Prix trop élevé")
  .nullable();
