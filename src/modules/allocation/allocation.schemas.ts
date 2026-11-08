/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 * Zod schemas for the allocation forms and Server Actions.
 */
import { z } from "zod";
import { objectIdSchema } from "@/modules/materiel/materiel.schemas";
import { ACTIONS_ALLOCATION, ETATS_RETOUR } from "./allocation.types";

const isoDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} is invalid`);

export const txHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid transaction hash")
  .transform((v) => v.toLowerCase());

export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address")
  .transform((v) => v.toLowerCase());

/** Step 1 — the form: what to allocate, for which séance, when. */
export const allocationRequestSchema = z
  .object({
    materielId: objectIdSchema("Equipment"),
    seanceId: z.string().min(1, "Choose a session").pipe(objectIdSchema("Session")),
    dateDebut: isoDate("Start"),
    dateFin: isoDate("End"),
  })
  .refine((v) => Date.parse(v.dateFin) > Date.parse(v.dateDebut), {
    path: ["dateFin"],
    message: "The end must be after the start",
  });
export type AllocationRequestInput = z.infer<typeof allocationRequestSchema>;

/** Step 2 — after MetaMask: the same data + the id the server issued + the tx to verify. */
export const allocationRecordSchema = z.object({
  allocationId: objectIdSchema("Allocation"),
  txHash: txHashSchema,
  materielId: objectIdSchema("Equipment"),
  seanceId: objectIdSchema("Session"),
  dateDebut: isoDate("Start"),
  dateFin: isoDate("End"),
});
export type AllocationRecordInput = z.infer<typeof allocationRecordSchema>;

/** Confirm / checkout / return / cancel, once signed. */
export const allocationStepSchema = z
  .object({
    id: objectIdSchema("Allocation"),
    action: z.enum(ACTIONS_ALLOCATION).exclude(["REQUEST"]),
    txHash: txHashSchema,
    etatRetour: z.enum(ETATS_RETOUR).optional(),
  })
  .refine((v) => v.action !== "RETURN" || v.etatRetour, {
    path: ["etatRetour"],
    message: "Choose the condition",
  });
export type AllocationStepInput = z.infer<typeof allocationStepSchema>;

export const walletLinkSchema = z.object({
  address: addressSchema,
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "Invalid signature"),
  issuedAt: isoDate("Date"),
});
export type WalletLinkInput = z.infer<typeof walletLinkSchema>;

/** Admin: an equipment item registered on-chain. */
export const equipmentRegisteredSchema = z.object({
  materielId: objectIdSchema("Equipment"),
  txHash: txHashSchema,
});

/** Admin: a photographer's wallet added as staff on-chain. */
export const staffAddedSchema = z.object({
  utilisateurId: objectIdSchema("Photographer"),
  txHash: txHashSchema,
});
