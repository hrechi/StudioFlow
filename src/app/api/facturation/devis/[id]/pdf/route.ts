/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { ForbiddenError, getDevis, NotFoundError, ValidationError } from "@/modules/facturation/devis.service";
import { renderDevisPdf, renderFacturePdf } from "@/modules/facturation/facturation.pdf";

/**
 * Branded PDF of a quote, or of one of its invoices with `?facture=<id>`.
 * Same visibility as the screens: admins see every quote, a client only their own sent quotes.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/facturation/devis/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const devis = await getDevis(id, user).catch((error: unknown) => {
    if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) return null;
    throw error;
  });
  if (!devis) return new Response("Not found", { status: 404 });

  const factureId = request.nextUrl.searchParams.get("facture");
  let bytes: Uint8Array;
  let filename: string;
  if (factureId) {
    const facture = devis.factures.find((f) => f.id === factureId);
    if (!facture) return new Response("Not found", { status: 404 });
    bytes = await renderFacturePdf(devis, facture);
    filename = `${facture.numero}.pdf`;
  } else {
    bytes = await renderDevisPdf(devis);
    filename = `${devis.numero}.pdf`;
  }

  return new Response(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
