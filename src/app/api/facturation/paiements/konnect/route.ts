/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { appUrl } from "@/modules/facturation/konnect";
import { confirmPaiementEnLigne } from "@/modules/facturation/paiement.service";

/**
 * Konnect webhook: GET ?payment_ref=…, called by Konnect and also used to redirect the payer
 * back after the checkout. Public on purpose: nothing in the request is trusted, the payment is
 * re-read from the Konnect API before the invoice is updated.
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("payment_ref") ?? request.nextUrl.searchParams.get("paymentRef");
  let statut = "INCONNU";
  if (ref && /^[A-Za-z0-9_-]{6,64}$/.test(ref)) {
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
