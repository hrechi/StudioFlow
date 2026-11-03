/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { NextRequest } from "next/server";
import { getGuestAccess, guestCookieName } from "@/modules/photos-galeries/galerie-guest";
import { getPhotoFileAccess } from "@/modules/photos-galeries/photo.service";

/**
 * Photo preview for guests of a shared gallery (no account, second opinion).
 * Read only: guests only ever get the WebP preview, never the original file,
 * and never as a download. The gallery must be open for this visitor (no
 * password, or the unlock cookie); the photo must be in it and not rejected.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/g/[token]/photos/[id]">) {
  const { token, id } = await ctx.params;
  const notFound = () => new Response("Not found", { status: 404 });

  const access = await getGuestAccess(token, request.cookies.get(guestCookieName(token))?.value);
  if (access.status !== "open") return notFound();

  const photo = await getPhotoFileAccess(id, "miniature");
  if (!photo || photo.galerieId !== access.galerie.id || photo.statutCulling === "REJETEE") {
    return notFound();
  }
  const file = await photo.open();
  if (!file) return notFound();

  return new Response(file.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
