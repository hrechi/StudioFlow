import "server-only";

/**
 * Konnect (konnect.network) — Tunisian payment gateway: bank card, e-Dinar and Konnect wallet,
 * in TND. Free sandbox: create an account on https://dashboard.sandbox.konnect.network, then copy
 * the API key and the wallet id into KONNECT_API_KEY / KONNECT_WALLET_ID.
 * Docs: https://docs.konnect.network/docs/en/api-integration/endpoints/initiate-payment
 *
 * Without those variables, a local payment simulator stands in for the checkout: always in
 * development, and in a production build only when PAIEMENT_SIMULATION=true (local Docker demo).
 */

const API_URL = (process.env.KONNECT_API_URL || "https://api.sandbox.konnect.network/api/v2").replace(/\/$/, "");

export type Passerelle = "KONNECT" | "STRIPE" | "SIMULATION";

export function konnectConfigured(): boolean {
  return !!(process.env.KONNECT_API_KEY && process.env.KONNECT_WALLET_ID);
}

/**
 * Online gateways offered to the client: Konnect (TND) and/or Stripe (test mode, EUR) when their
 * keys are set; otherwise the test checkout (dev, or PAIEMENT_SIMULATION=true).
 */
export function passerellesDisponibles(): Passerelle[] {
  const list: Passerelle[] = [];
  if (konnectConfigured()) list.push("KONNECT");
  if (process.env.STRIPE_SECRET_KEY) list.push("STRIPE");
  if (list.length === 0 && (process.env.NODE_ENV !== "production" || process.env.PAIEMENT_SIMULATION === "true")) list.push("SIMULATION");
  return list;
}

/** Public base URL of the app, used for the gateway callback (the browser is redirected there). */
export function appUrl(): string {
  return (process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": process.env.KONNECT_API_KEY ?? "", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Konnect ${path} failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

export async function konnectInitPayment(input: {
  amount: number; // millimes
  orderId: string;
  description: string;
  webhook: string;
  client: { firstName: string; lastName: string; email: string; phoneNumber?: string };
}): Promise<{ payUrl: string; paymentRef: string }> {
  return call("/payments/init-payment", {
    method: "POST",
    body: JSON.stringify({
      receiverWalletId: process.env.KONNECT_WALLET_ID,
      token: "TND",
      amount: input.amount,
      type: "immediate",
      description: input.description.slice(0, 200),
      acceptedPaymentMethods: ["bank_card", "e-DINAR", "wallet"],
      lifespan: 30,
      checkoutForm: false,
      addPaymentFeesToAmount: false,
      firstName: input.client.firstName,
      lastName: input.client.lastName,
      email: input.client.email,
      phoneNumber: input.client.phoneNumber,
      orderId: input.orderId,
      // Called as GET with ?payment_ref=… and, since it is not silent, the payer is redirected there too.
      webhook: input.webhook,
      theme: "dark",
    }),
  });
}

/** The only source of truth for a payment: status "completed" means the money was received. */
export async function konnectGetPayment(paymentRef: string): Promise<{ status: string; amount: number; reachedAmount?: number }> {
  const { payment } = await call<{ payment: { status: string; amount: number; reachedAmount?: number } }>(
    `/payments/${encodeURIComponent(paymentRef)}`,
    { method: "GET" },
  );
  return payment;
}
