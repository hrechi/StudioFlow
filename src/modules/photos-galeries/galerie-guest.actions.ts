"use server";

import { cookies } from "next/headers";
import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { extractToken, guestCookieMaxAge, guestCookieName, signGuestAccess } from "./galerie-guest";
import { guestAccessSchema } from "./galerie.schemas";
import { checkGaleriePassword, findSharedGalerie, galeriePublicPath } from "./galerie.service";

// Same message for an unknown link and a wrong password: a guest can't probe links.
const INVALID_ACCESS = "This link or password is incorrect, or the gallery is no longer available.";

/**
 * Public (no account): checks a shared-gallery link + password, then remembers
 * the access in an httpOnly cookie and returns the gallery page to open.
 */
export async function openSharedGalerieAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = guestAccessSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const token = extractToken(parsed.data.lien);
  if (!token) return failure(INVALID_ACCESS, { lien: ["Paste the link or the code you received"] });

  const shared = await findSharedGalerie(token);
  if (shared.status !== "ok") return failure(INVALID_ACCESS);
  if (!(await checkGaleriePassword(shared.passwordHash, parsed.data.motDePasse))) {
    return failure(INVALID_ACCESS);
  }

  if (shared.passwordHash) {
    (await cookies()).set(guestCookieName(token), signGuestAccess(token, shared.passwordHash), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: guestCookieMaxAge(shared.galerie.dateExpiration),
    });
  }
  return success({ redirectTo: galeriePublicPath(token) });
}
