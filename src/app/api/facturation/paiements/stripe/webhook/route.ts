/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { confirmPaiementEnLigne } from "@/modules/facturation/paiement.service";
import { stripeVerifySignature } from "@/modules/facturation/stripe";

/**
 * Optional Stripe webhook (checkout.session.completed / expired), for when the payer closes the
 * tab before coming back. Enabled when STRIPE_WEBHOOK_SECRET is set; the signature is checked,
 * then the session is still re-read from the Stripe API by confirmPaiementEnLigne.
 * Local testing: stripe listen --forward-to localhost:3000/api/facturation/paiements/stripe/webhook
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 404 });
  const payload = await request.text();
  if (!stripeVerifySignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Invalid signature", { status: 400 });
  }
  const event = JSON.parse(payload) as { type?: string; data?: { object?: { id?: string } } };
  const ref = event.data?.object?.id;
  if (ref && (event.type === "checkout.session.completed" || event.type === "checkout.session.expired")) {
    try {
      if ((await confirmPaiementEnLigne(ref)) === "PAYE") {
        revalidatePath("/espace-client/factures");
        revalidatePath("/dashboard/facturation/factures");
      }
    } catch (error) {
      console.error(error);
      return new Response("Retry later", { status: 500 }); // Stripe retries failed deliveries
    }
  }
  return Response.json({ received: true });
}
