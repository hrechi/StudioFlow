/**
 * Role-based access control: roles, permission matrix and route rules.
 * Pure module (no DB, no Node APIs) so it can run in proxy.ts and in client
 * components (sidebar). Server-side enforcement lives in lib/guards.ts.
 */
import {
  ROLES,
  STAFF_ROLES,
  type Role,
  type StaffRole,
} from "@/modules/utilisateurs/utilisateur.types";

export { ROLES, STAFF_ROLES, type Role, type StaffRole };

const STAFF = STAFF_ROLES;

/** Permission matrix (prompt §5). The sidebar is built from it. */
export const PERMISSIONS = {
  dashboard: STAFF,
  seances: ["ADMIN", "PHOTOGRAPHE"],
  catalogue: ["ADMIN"],
  "photos-galeries": STAFF,
  materiel: ["ADMIN", "PHOTOGRAPHE"],
  facturation: ["ADMIN"],
  portfolio: STAFF,
  "avis-reclamations": ["ADMIN"],
  utilisateurs: ["ADMIN"],
  profil: ROLES,
  "espace-client": ["CLIENT"],
} as const satisfies Record<string, readonly Role[]>;

export type Area = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, area: Area): boolean {
  return !!role && (PERMISSIONS[area] as readonly Role[]).includes(role);
}

export function isStaff(role: Role | null | undefined): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly Role[]).includes(role);
}

/** Longest prefix first. Paths not listed here are public. */
const ROUTE_AREAS: ReadonlyArray<readonly [prefix: string, area: Area]> = [
  ["/dashboard/utilisateurs", "utilisateurs"],
  ["/dashboard/catalogue", "catalogue"],
  ["/dashboard/seances", "seances"],
  ["/dashboard/lieux", "seances"],
  ["/dashboard/photos", "photos-galeries"],
  ["/dashboard/galeries", "photos-galeries"],
  ["/dashboard/materiel", "materiel"],
  ["/dashboard/facturation", "facturation"],
  ["/dashboard/portfolio", "portfolio"],
  ["/dashboard/avis", "avis-reclamations"],
  ["/dashboard/reclamations", "avis-reclamations"],
  ["/dashboard", "dashboard"],
  ["/espace-client", "espace-client"],
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function areaForPath(pathname: string): Area | null {
  return ROUTE_AREAS.find(([prefix]) => matches(pathname, prefix))?.[1] ?? null;
}

export function canAccessPath(role: Role | null | undefined, pathname: string): boolean {
  const area = areaForPath(pathname);
  return area === null || can(role, area);
}

/** Where a user lands after sign-in. */
export function homeForRole(role: Role | null | undefined): string {
  if (!role) return "/";
  return role === "CLIENT" ? "/espace-client" : "/dashboard";
}

/** Uses `callbackUrl` only if it is a local path the role may open. */
export function resolveRedirect(role: Role, callbackUrl?: string | null): string {
  if (
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") &&
    !callbackUrl.startsWith("/login") &&
    !callbackUrl.startsWith("/register")
  ) {
    const pathname = callbackUrl.split(/[?#]/)[0];
    const area = areaForPath(pathname);
    if (area !== null && can(role, area)) return callbackUrl;
  }
  return homeForRole(role);
}
