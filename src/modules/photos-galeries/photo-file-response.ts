import "server-only";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { getPhotoFileAccess } from "./photo.service";

export function attachmentHeader(filename: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Shared by GET /api/photos/[id]/file and /miniature. Staff of the module see
 * every photo; a client only sees non-rejected photos of their shared galleries.
 * Missing and forbidden both answer 404 so ids can't be probed.
 *
 * `download`: original file as an attachment. Staff always; the assigned client
 * only when the studio allowed downloads on the gallery.
 */
export async function photoFileResponse(
  photoId: string,
  variant: "file" | "miniature",
  download = false,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const access = await getPhotoFileAccess(photoId, variant);
  const allowed =
    !!access &&
    (can(user.role, "photos-galeries") ||
      (user.role === "CLIENT" &&
        access.clientId === user.id &&
        access.statutGalerie !== "EN_TRI" &&
        access.statutCulling !== "REJETEE"));
  if (!allowed) return new Response("Not found", { status: 404 });
  if (download && !(can(user.role, "photos-galeries") || access.telechargementAutorise)) {
    return new Response("Downloads are not allowed for this gallery.", { status: 403 });
  }
  const file = await access.open();
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      // Private (access depends on the session) and short, so a signed-out browser
      // stops showing cached photos within minutes.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": attachmentHeader(access.nomFichier) } : {}),
    },
  });
}
