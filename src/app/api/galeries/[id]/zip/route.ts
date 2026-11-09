/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { zipToWebStream } from "@/lib/streams";
import { can } from "@/lib/rbac";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { attachmentHeader } from "@/modules/photos-galeries/photo-file-response";
import { listDownloadablePhotos } from "@/modules/photos-galeries/photo.service";
import { clientOriginalsGate, loadProofContext } from "@/modules/snapseal/snapseal.guards";

/**
 * "Download all": the gallery's photos as one ZIP (every photo for staff, the non-rejected ones for the client),
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

  // SnapSeal (galleries with the option only): the client's originals wait for the selection
  // on-chain, and the ZIP holds only the sealed photos.
  let onlyIds: string[] | undefined;
  if (!isStaff && galerie.preuveBlockchainRequise) {
    const gate = await clientOriginalsGate(galerie.id);
    if (gate === "unavailable") {
      return new Response("The blockchain can't be reached right now. Please try again later.", {
        status: 503,
      });
    }
    if (gate === "refused") {
      return new Response(
        "Originals are available once your selection is validated on the blockchain.",
        { status: 403 },
      );
    }
    onlyIds = (await loadProofContext(galerie.id))?.seal?.photos.map((p) => p.photo.toString()) ?? [];
  }

  // Staff get every photo of the gallery; the client never sees the ones culled out.
  const photos = await listDownloadablePhotos(galerie.id, { includeRejected: isStaff, onlyIds });
  const stream = zipToWebStream(photos);

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
