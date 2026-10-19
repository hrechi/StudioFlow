/**
 * Module : Gestion des Photos & Galeries · Responsable : Louay Herichi
 * Zod schemas shared by the forms (client) and the Server Actions (server).
 */
import { z } from "zod";
import { CATEGORIES_GALERIE, STATUTS_CULLING, STATUTS_GALERIE } from "./galerie.types";

const objectIdSchema = (label: string) => z.string().regex(/^[a-f\d]{24}$/i, `${label} is invalid`);

const titreSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(120, "120 characters maximum");

const categorieSchema = z.enum(CATEGORIES_GALERIE, { error: "Choose a category" });

/** "YYYY-MM-DD" from an <input type="date">. */
const dateExpirationSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an expiry date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

/** Gallery password: "" means "no password" (create) or "keep the current one" (share). */
const galeriePasswordSchema = z
  .string()
  .max(72, "72 characters maximum")
  .refine((value) => value === "" || value.length >= 4, "At least 4 characters");

export const galerieCreateSchema = z.object({
  titre: titreSchema,
  categorie: categorieSchema,
  clientId: z.string().min(1, "Choose a client").pipe(objectIdSchema("Client")),
  dateExpiration: dateExpirationSchema,
  telechargementAutorise: z.boolean(),
  motDePasse: galeriePasswordSchema,
});
export type GalerieCreateInput = z.infer<typeof galerieCreateSchema>;

export const galerieUpdateSchema = z.object({
  titre: titreSchema,
  categorie: categorieSchema,
  clientId: z.string().min(1, "Choose a client").pipe(objectIdSchema("Client")),
  statut: z.enum(STATUTS_GALERIE, { error: "Invalid status" }),
});
export type GalerieUpdateInput = z.infer<typeof galerieUpdateSchema>;

/** Share settings card of /dashboard/galeries/[id]. */
export const galerieShareSchema = z.object({
  dateExpiration: dateExpirationSchema,
  telechargementAutorise: z.boolean(),
  motDePasse: galeriePasswordSchema,
  retirerMotDePasse: z.boolean(),
});
export type GalerieShareInput = z.infer<typeof galerieShareSchema>;

export const galerieListQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  statut: z.enum(STATUTS_GALERIE).optional().catch(undefined),
});
export type GalerieListQuery = z.infer<typeof galerieListQuerySchema>;

const photoIdsSchema = z
  .array(objectIdSchema("Photo"))
  .min(1, "Select at least one photo")
  .max(500, "500 photos maximum at once");

export const setCullingSchema = z.object({
  ids: photoIdsSchema,
  statut: z.enum(STATUTS_CULLING, { error: "Invalid culling status" }),
});
export type SetCullingInput = z.infer<typeof setCullingSchema>;

export const deletePhotosSchema = z.object({ ids: photoIdsSchema });

export const setCouvertureSchema = z.object({
  galerieId: objectIdSchema("Gallery"),
  photoId: objectIdSchema("Photo"),
});

/** Public "view a shared gallery" form (front office). */
export const guestAccessSchema = z.object({
  lien: z.string().trim().min(1, "Paste the link or the code you received").max(300),
  motDePasse: z.string().max(72, "72 characters maximum"),
});
export type GuestAccessInput = z.infer<typeof guestAccessSchema>;
