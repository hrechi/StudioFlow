import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout (test mode) — second online gateway next to Konnect. Stripe does not support
 * TND, so the amount is charged in EUR at STRIPE_TND_EUR_RATE (fine for demos; Konnect stays
 * the gateway for real Tunisian payments). Free test keys: https://dashboard.stripe.com/test/apikeys
 * Test card: 4242 4242 4242 4242, any future date, any CVC.
 * Called with fetch (no SDK): https://docs.stripe.com/api/checkout/sessions/create
 */

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** TND per EUR conversion used for the charge (1 TND ≈ 0.30 EUR by default). */
export function tauxTndEur(): number {
  const rate = Number(process.env.STRIPE_TND_EUR_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 0.3;
}

/** Millimes of TND → euro cents (Stripe's minimum charge is 0.50 EUR). */
export function millimesToEurCents(millimes: number): number {
  return Math.max(50, Math.round((millimes / 1000) * tauxTndEur() * 100));
}

/** Stripe expects nested params as form fields: line_items[0][price_data][currency]=eur… */
function form(data: Record<string, string | number | undefined>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) if (value !== undefined) body.set(key, String(value));
  return body;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY ?? ""}`, ...init.headers },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(`Stripe ${path} failed (${response.status}): ${json.error?.message ?? "unknown error"}`);
  return json;
}

export type StripeSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
};

export async function stripeCreateCheckout(input: {
  amountCents: number;
  name: string;
  description: string;
  reference: string;
  email?: string;
  successUrl: string; // must contain {CHECKOUT_SESSION_ID}
  cancelUrl: string;
}): Promise<StripeSession> {
  return call<StripeSession>("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": input.amountCents,
      "line_items[0][price_data][product_data][name]": input.name.slice(0, 250),
      "line_items[0][price_data][product_data][description]": input.description.slice(0, 500),
      client_reference_id: input.reference,
      customer_email: input.email,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      "metadata[facture]": input.reference,
    }),
  });
}

/** The only source of truth: a session is settled when Stripe itself says payment_status = "paid". */
export async function stripeGetSession(id: string): Promise<StripeSession> {
  return call<StripeSession>(`/checkout/sessions/${encodeURIComponent(id)}`);
}

/**
 * Verifies the Stripe-Signature header of a webhook (HMAC-SHA256 of "timestamp.payload" with the
 * endpoint secret, 5 minutes tolerance): https://docs.stripe.com/webhooks#verify-manually
 */
export function stripeVerifySignature(payload: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const timestamp = Number(parts.t);
  const signatures = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((sig) => {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
