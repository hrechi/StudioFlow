import { z } from "zod";
import { objectIdSchema } from "./catalogue.schemas";
import { PHASES, PRIORITES, STATUTS_TACHE } from "./tache.dto";

export const tacheSchema = z.object({
  seanceId: z.string().min(1, "Choose a session").pipe(objectIdSchema("Session")),
  titre: z.string().trim().min(2, "At least 2 characters").max(120, "120 characters maximum"),
  description: z.string().trim().max(500, "500 characters maximum"),
  employeId: z.string().refine((v) => v === "" || /^[a-f\d]{24}$/i.test(v), "Employee is invalid"),
  dateLimite: z.string().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Deadline is invalid"),
  priorite: z.enum(PRIORITES, { error: "Invalid priority" }),
  phase: z.enum(PHASES, { error: "Invalid phase" }),
  statut: z.enum(STATUTS_TACHE, { error: "Invalid status" }),
});
export type TacheInput = z.infer<typeof tacheSchema>;

export const tacheStatutSchema = z.enum(STATUTS_TACHE, { error: "Invalid status" });
