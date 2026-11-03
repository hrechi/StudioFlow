/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { findPreuve } from "@/modules/facturation/paiement.service";
import { openPreuve } from "@/modules/facturation/preuve.storage";

/** A payment proof, shown inline to the admin reviewing it or to the client who sent it. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/facturation/preuves/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const preuve = await findPreuve(id, user);
  const file = preuve ? await openPreuve(preuve.fichier) : null;
  if (!preuve || !file) return new Response("Not found", { status: 404 });
  return new Response(file.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="${encodeURIComponent(preuve.nom)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
