import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurDTO } from "@/modules/utilisateurs/utilisateur.types";
import { auth } from "./auth";
import { can, homeForRole, type Area, type Role } from "./rbac";

/**
 * Server-side authorization. Every protected page, layout, Server Action and
 * Route Handler calls one of these — hiding a button is not security.
 *
 * The user is reloaded from MongoDB (once per request) so that a block, a role
 * change or a deletion applies immediately, even if the JWT is still valid.
 */
export const getCurrentUser = cache(async (): Promise<UtilisateurDTO | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await findUtilisateurById(session.user.id);
  if (!user) redirect("/deconnexion?raison=supprime");
  if (user.statut === "BLOQUE") redirect("/deconnexion?raison=bloque");
  if (user.role !== session.user.role) redirect("/deconnexion?raison=role");
  return user;
});

/** Any signed-in user, or redirect to /login. */
export async function requireUser(): Promise<UtilisateurDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed-in user with one of `roles`; others go to their own home (or the refusal page). */
export async function requireRole(...roles: Role[]): Promise<UtilisateurDTO> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(refusalTarget(user.role));
  return user;
}

/** Signed-in user allowed in a permission-matrix area (see lib/rbac.ts). */
export async function requireArea(area: Area): Promise<UtilisateurDTO> {
  const user = await requireUser();
  if (!can(user.role, area)) redirect(refusalTarget(user.role));
  return user;
}

function refusalTarget(role: Role): string {
  // Staff inside the backoffice see an explanation; clients go back to their area.
  return role === "CLIENT" ? homeForRole(role) : "/dashboard/acces-refuse";
}
