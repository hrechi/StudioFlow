"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  failure,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { signIn, signOut, updateSession } from "@/lib/auth";
import { requireRole, requireUser } from "@/lib/guards";
import { homeForRole, resolveRedirect } from "@/lib/rbac";
import {
  adminCreateUser,
  adminUpdateUser,
  changePassword,
  changeRole,
  changeStatut,
  deleteOwnAccount,
  deleteUser,
  findUtilisateurByEmail,
  registerClient,
  updateProfile,
} from "./utilisateur.service";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  changePasswordSchema,
  changeRoleSchema,
  changeStatutSchema,
  deleteAccountSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "./utilisateur.schemas";
import type { UtilisateurDTO } from "./utilisateur.types";

const INVALID_CREDENTIALS = "Incorrect email or password";
const BLOCKED = "Account blocked, please contact the studio";

// ── Authentication ──────────────────────────────────────────────────────────

export async function loginAction(
  input: unknown,
  callbackUrl?: string | null,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "compte_bloque") {
      return failure(BLOCKED);
    }
    if (error instanceof AuthError) return failure(INVALID_CREDENTIALS);
    return toFailure(error);
  }

  const user = await findUtilisateurByEmail(parsed.data.email);
  return success({ redirectTo: user ? resolveRedirect(user.role, callbackUrl) : "/" });
}

/** Public sign-up — always a CLIENT, then signs in and goes to /espace-client. */
export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await registerClient(parsed.data);
  } catch (error) {
    return toFailure(error);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      motDePasse: parsed.data.motDePasse,
      redirect: false,
    });
  } catch {
    // Account exists; the user can still sign in manually.
    return success({ redirectTo: "/login" });
  }
  return success({ redirectTo: homeForRole("CLIENT") });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/?deconnecte=1" });
}

const FORCED_REASONS = ["bloque", "supprime", "role", "session"] as const;

/** Used by /deconnexion when the guards detect a blocked, deleted or changed account. */
export async function forcedSignOutAction(raison: string): Promise<void> {
  const reason = (FORCED_REASONS as readonly string[]).includes(raison) ? raison : "session";
  await signOut({ redirectTo: `/login?raison=${reason}` });
}

// ── Profile (every role) ────────────────────────────────────────────────────

export async function updateProfileAction(input: unknown): Promise<ActionResult<UtilisateurDTO>> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await updateProfile(user.id, parsed.data);
    await updateSession({
      user: { nom: updated.nom, prenom: updated.prenom, photoProfil: updated.photoProfil ?? null },
    });
    revalidatePath("/", "layout");
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await changePassword(user.id, parsed.data.motDePasseActuel, parsed.data.nouveauMotDePasse);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** Deletes the current account (password required), then signs out to "/". */
export async function deleteOwnAccountAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await deleteOwnAccount(user.id, parsed.data.motDePasse);
  } catch (error) {
    return toFailure(error);
  }
  await signOut({ redirectTo: "/?compte=supprime" });
  return success();
}

// ── Administration (ADMIN only) ─────────────────────────────────────────────

const USERS_PATH = "/dashboard/utilisateurs";

export async function adminCreateUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const created = await adminCreateUser(parsed.data);
    revalidatePath(USERS_PATH);
    return success({ id: created.id });
  } catch (error) {
    return toFailure(error);
  }
}

export async function adminUpdateUserAction(
  id: string,
  input: unknown,
): Promise<ActionResult<UtilisateurDTO>> {
  const admin = await requireRole("ADMIN");
  const parsed = adminUpdateUserSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await adminUpdateUser(admin.id, id, parsed.data);
    revalidatePath(USERS_PATH, "layout");
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function changeRoleAction(input: unknown): Promise<ActionResult<UtilisateurDTO>> {
  const admin = await requireRole("ADMIN");
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await changeRole(admin.id, parsed.data.id, parsed.data.role);
    revalidatePath(USERS_PATH, "layout");
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function changeStatutAction(input: unknown): Promise<ActionResult<UtilisateurDTO>> {
  const admin = await requireRole("ADMIN");
  const parsed = changeStatutSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await changeStatut(admin.id, parsed.data.id, parsed.data.statut);
    revalidatePath(USERS_PATH, "layout");
    return success(updated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  try {
    await deleteUser(admin.id, id);
    revalidatePath(USERS_PATH, "layout");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
