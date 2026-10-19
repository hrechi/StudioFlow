/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { Zip, ZipPassThrough } from "fflate";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { attachmentHeader } from "@/modules/photos-galeries/photo-file-response";
import { listDownloadablePhotos } from "@/modules/photos-galeries/photo.service";

/** Same file name twice in a gallery → "name (2).jpg". */
function uniqueName(name: string, used: Map<string, number>): string {
  const count = (used.get(name) ?? 0) + 1;
  used.set(name, count);
  if (count === 1) return name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
}

/**
 * "Download all": the originals of the gallery's non-rejected photos as one ZIP,
 * streamed (JPEGs are already compressed, so entries are stored, not deflated).
 * Staff always; the assigned client only once shared and if downloads are allowed.
 * Guests (shared link) never reach this route: it requires an account.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/galeries/[id]/zip">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const galerie = await getGalerieById(id);
  const isStaff = can(user.role, "photos-galeries");
  const isOwner =
    !!galerie &&
    user.role === "CLIENT" &&
    galerie.client.id === user.id &&
    galerie.statut !== "EN_TRI";
  if (!galerie || (!isStaff && !isOwner)) return new Response("Not found", { status: 404 });
  if (!isStaff && !galerie.telechargementAutorise) {
    return new Response("Downloads are not allowed for this gallery.", { status: 403 });
  }

  const photos = await listDownloadablePhotos(galerie.id);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) return controller.error(error);
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const used = new Map<string, number>();
      try {
        for (const photo of photos) {
          const entry = new ZipPassThrough(uniqueName(photo.nomFichier, used));
          zip.add(entry);
          for await (const chunk of await photo.read()) entry.push(new Uint8Array(chunk));
          entry.push(new Uint8Array(0), true);
        }
        zip.end();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const filename = `${galerie.titre.replace(/[\/:*?"<>|]+/g, "-").trim() || "gallery"}.zip`;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": attachmentHeader(filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
