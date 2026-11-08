/* Module : SnapSeal (blockchain proof of a gallery's selection and delivery) */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { attachmentHeader } from "@/modules/photos-galeries/photo-file-response";
import { openFile } from "@/modules/photos-galeries/photo.storage";
import { clientDeliveryGate, loadProofContext } from "@/modules/snapseal/snapseal.guards";

/**
 * GET: the stored delivery package of a sealed gallery — exactly the file whose fingerprint
 * was published on-chain. Staff always; the gallery's client only once the delivery is
 * verified on-chain (its hash equals the stored package). Missing and forbidden look the same.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/galeries/[id]/livraison">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const proof = await loadProofContext(id);
  const livraison = proof?.seal?.livraison;
  if (!proof || !livraison) return new Response("Not found", { status: 404 });

  const isStaff = can(user.role, "photos-galeries");
  if (!isStaff) {
    const isOwner =
      user.role === "CLIENT" &&
      proof.galerie.client.toString() === user.id &&
      proof.galerie.statut !== "EN_TRI";
    if (!isOwner) return new Response("Not found", { status: 404 });
    const gate = await clientDeliveryGate(proof.galerie._id);
    if (gate === "unavailable") {
      return new Response("The blockchain can't be reached right now. Please try again later.", {
        status: 503,
      });
    }
    if (gate !== "ok") {
      return new Response("The delivery is not published on the blockchain yet.", { status: 403 });
    }
  }

  const file = await openFile(livraison.fichier);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.stream, {
    headers: {
      "Content-Type": livraison.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": attachmentHeader(livraison.nomFichier),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
