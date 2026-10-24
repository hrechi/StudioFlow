import { NextRequest, NextResponse } from "next/server";
import { getPublicPortfolio, incrementElementLike } from "@/modules/portfolio/portfolio.service";
import { z } from "zod";
import { allowPortfolioRequest, getRequestAddress } from "@/modules/portfolio/rate-limit";

const likeSchema = z.object({ portfolioId: z.string().regex(/^[a-f\d]{24}$/i), elementId: z.string().regex(/^[a-f\d]{24}$/i) });

export async function POST(request: NextRequest, context: RouteContext<"/api/portfolio/[slug]/like">) {
  const { slug } = await context.params;
  if (!allowPortfolioRequest(`like:${getRequestAddress(request)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Invalid request body." }, { status: 400 });
  }
  const parsed = likeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: "Invalid like." }, { status: 400 });
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio || portfolio.id !== parsed.data.portfolioId) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Portfolio unavailable." }, { status: 404 });
  const cookie = `portfolio-likes-${portfolio.id}`;
  const liked = request.cookies.get(cookie)?.value.split(".").filter(Boolean) ?? [];
  if (liked.includes(parsed.data.elementId)) {
    return NextResponse.json({ ok: false, code: "ALREADY_LIKED", message: "You already liked this photo." }, { status: 409 });
  }
  try {
    await incrementElementLike(portfolio.id, parsed.data.elementId);
  } catch {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Photo unavailable." }, { status: 404 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie, [...liked, parsed.data.elementId].slice(-100).join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
