/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { appUrl } from "@/modules/facturation/konnect";
import { confirmPaiementEnLigne } from "@/modules/facturation/paiement.service";

/**
 * Stripe success_url: GET ?session_id=cs_…  The payer lands here after the checkout; the session
 * is re-read from the Stripe API before the invoice is updated (nothing in the URL is trusted).
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("session_id");
  let statut = "INCONNU";
  if (ref && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(ref)) {
    try {
      statut = await confirmPaiementEnLigne(ref);
    } catch (error) {
      console.error(error);
      statut = "EN_ATTENTE";
    }
  }
  if (statut === "PAYE") {
    revalidatePath("/espace-client/factures");
    revalidatePath("/dashboard/facturation/factures");
  }
  const result = statut === "PAYE" ? "success" : statut === "EN_ATTENTE" ? "pending" : "failed";
  return Response.redirect(`${appUrl()}/espace-client/factures?paiement=${result}`, 303);
}
