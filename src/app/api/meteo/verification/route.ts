import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verifierMeteo } from "@/modules/seances/meteo.service";

/**
 * Scheduled weather check (cron). Public path, so it protects itself: it only runs with
 * `Authorization: Bearer <CRON_SECRET>`. Without CRON_SECRET configured it is disabled (503).
 * It reads forecasts and opens alerts; it never changes a session.
 *   e.g. every 3 hours:  curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/meteo/verification
 */
export const dynamic = "force-dynamic";

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Weather check is not configured." }, { status: 503 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(await verifierMeteo());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The weather check failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
