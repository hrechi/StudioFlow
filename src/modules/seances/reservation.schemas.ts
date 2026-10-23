import { z } from "zod";
import { objectIdSchema } from "./catalogue.schemas";

export const reservationSchema = z.object({
  packId: z.string().min(1, "Choose a pack").pipe(objectIdSchema("Pack")),
  dateDebut: z
    .string()
    .min(1, "Choose a date and time")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date is invalid"),
  lieu: z.string().trim().min(2, "Tell us where it takes place").max(200, "200 characters maximum"),
  message: z.string().trim().max(500, "500 characters maximum"),
});
export type ReservationInput = z.infer<typeof reservationSchema>;
