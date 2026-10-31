import { NextResponse } from "next/server";
import { contactPortfolioSchema } from "@/modules/portfolio/portfolio.schemas";
import { createContactRequest } from "@/modules/portfolio/portfolio.service";
import { allowPortfolioRequest, getRequestAddress } from "@/modules/portfolio/rate-limit";

export async function POST(request: Request) {
  if (!allowPortfolioRequest(`contact:${getRequestAddress(request)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Invalid request body." }, { status: 400 });
  }
  const parsed = contactPortfolioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: "Invalid contact form." }, { status: 400 });
  try {
    const result = await createContactRequest(parsed.data);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, code: "CONTACT_FAILED", message: "Unable to send your request." }, { status: 400 });
  }
}
