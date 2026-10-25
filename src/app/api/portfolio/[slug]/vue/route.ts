import { NextRequest, NextResponse } from "next/server";
import { getPublicPortfolio, incrementPortfolioView } from "@/modules/portfolio/portfolio.service";
import { allowPortfolioRequest, getRequestAddress } from "@/modules/portfolio/rate-limit";

export async function POST(request: NextRequest, context: RouteContext<"/api/portfolio/[slug]/vue">) {
  const { slug } = await context.params;
  if (!allowPortfolioRequest(`view:${getRequestAddress(request)}`, 60, 60_000)) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Please try again later." }, { status: 429 });
  }
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Portfolio unavailable." }, { status: 404 });
  const visited = request.cookies.get("portfolio-views")?.value.split(".").filter(Boolean) ?? [];
  const isUnique = !visited.includes(portfolio.id);
  await incrementPortfolioView(portfolio.id, isUnique);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("portfolio-views", [...visited.filter((id) => id !== portfolio.id), portfolio.id].slice(-40).join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}
