/**
 * Module : Gestion des Utilisateurs (core)
 * Zod schemas shared by the forms (client) and the Server Actions (server).
 * Optional text fields accept "" from forms; the service turns "" into "unset".
 */
import { z } from "zod";
import { ROLES, STATUTS_COMPTE, TYPES_CLIENT } from "./utilisateur.types";

export const PASSWORD_MIN = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`)
  .max(72, "72 characters maximum")
  .regex(/[A-Za-zÀ-ÿ]/, "At least one letter")
  .regex(/\d/, "At least one digit");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .pipe(z.email("Invalid email address"));

const nameSchema = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(60, "60 characters maximum");

const optionalText = (max: number) => z.string().trim().max(max, `${max} characters maximum`);

const telephoneSchema = optionalText(30).regex(/^[+\d\s().-]*$/, "Invalid phone number");

const photoUrlSchema = optionalText(500).refine(
  (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
  "Invalid URL (http:// or https://)",
);

const roleSchema = z.enum(ROLES, { error: "Invalid role" });
const statutSchema = z.enum(STATUTS_COMPTE, { error: "Invalid status" });
const typeClientSchema = z.enum(TYPES_CLIENT, { error: "Choose a client type" });

/** Requires `entreprise` when typeClient is ENTREPRISE. */
function requireEntreprise(
  value: { typeClient?: string; entreprise?: string; role?: string },
  ctx: z.RefinementCtx,
) {
  const isClient = value.role === undefined || value.role === "CLIENT";
  if (isClient && value.typeClient === "ENTREPRISE" && !value.entreprise?.trim()) {
    ctx.addIssue({ code: "custom", path: ["entreprise"], message: "Company name is required" });
  }
}

function requireSamePassword(
  value: { confirmation: string } & ({ motDePasse: string } | { nouveauMotDePasse: string }),
  ctx: z.RefinementCtx,
) {
  const password = "motDePasse" in value ? value.motDePasse : value.nouveauMotDePasse;
  if (password && value.confirmation !== password) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmation"],
      message: "Passwords do not match",
    });
  }
}

// ── Authentication ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  motDePasse: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    prenom: nameSchema("First name"),
    nom: nameSchema("Last name"),
    email: emailSchema,
    telephone: telephoneSchema,
    typeClient: typeClientSchema,
    entreprise: optionalText(120),
    motDePasse: passwordSchema,
    confirmation: z.string().min(1, "Please confirm the password"),
    accepteConditions: z.boolean().refine((v) => v, "You must accept the terms"),
  })
  .superRefine(requireEntreprise)
  .superRefine(requireSamePassword);
export type RegisterInput = z.infer<typeof registerSchema>;

// ── Profile (every role) ────────────────────────────────────────────────────

export const profileSchema = z
  .object({
    prenom: nameSchema("First name"),
    nom: nameSchema("Last name"),
    telephone: telephoneSchema,
    adresse: optionalText(200),
    photoProfil: photoUrlSchema,
    // Client-only fields (ignored by the service for staff)
    typeClient: typeClientSchema.optional(),
    entreprise: optionalText(120),
    // Staff-only field (ignored by the service for clients)
    specialite: optionalText(120),
  })
  .superRefine(requireEntreprise);
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    motDePasseActuel: z.string().min(1, "Current password is required"),
    nouveauMotDePasse: passwordSchema,
    confirmation: z.string().min(1, "Please confirm the new password"),
  })
  .superRefine(requireSamePassword)
  .refine((v) => v.nouveauMotDePasse !== v.motDePasseActuel, {
    path: ["nouveauMotDePasse"],
    message: "The new password must be different from the current one",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  motDePasse: z.string().min(1, "Enter your password to confirm"),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// ── Administration (ADMIN only) ─────────────────────────────────────────────

const adminUserBase = z.object({
  prenom: nameSchema("First name"),
  nom: nameSchema("Last name"),
  email: emailSchema,
  telephone: telephoneSchema,
  adresse: optionalText(200),
  photoProfil: photoUrlSchema,
  role: roleSchema,
  statut: statutSchema,
  typeClient: typeClientSchema.optional(),
  entreprise: optionalText(120),
  specialite: optionalText(120),
});

export const adminCreateUserSchema = adminUserBase
  .extend({
    motDePasse: passwordSchema,
    confirmation: z.string().min(1, "Please confirm the password"),
  })
  .superRefine(requireEntreprise)
  .superRefine(requireSamePassword);
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserSchema = adminUserBase
  .extend({
    // Empty = keep the current password
    motDePasse: z.union([z.literal(""), passwordSchema]),
    confirmation: z.string(),
  })
  .superRefine(requireEntreprise)
  .superRefine(requireSamePassword);
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const changeRoleSchema = z.object({ id: z.string().min(1), role: roleSchema });
export const changeStatutSchema = z.object({ id: z.string().min(1), statut: statutSchema });

/** `/dashboard/utilisateurs` search params (server-side filtering + pagination). */
export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  role: roleSchema.optional().catch(undefined),
  statut: statutSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
