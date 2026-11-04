import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortfolioForPublicRoute } from "@/modules/portfolio/portfolio.service";
import { PortfolioPublicContent } from "@/modules/portfolio/components/portfolio-public-content";
import { PortfolioPageReveal } from "@/modules/portfolio/components/transitions/PortfolioPageReveal";
import { categoriePortfolioLabelsEn } from "@/modules/portfolio/portfolio.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPortfolioForPublicRoute(slug);

  if (result.status === "PUBLISHED") {
    const portfolio = result.portfolio;
    const specialty = portfolio.specialites[0]
      ? categoriePortfolioLabelsEn[portfolio.specialites[0]].toLocaleLowerCase("en-US")
      : "photographer";
    const location = portfolio.ville ? ` in ${portfolio.ville}` : "";
    const generatedTitle = `${portfolio.photographe.prenom} ${portfolio.photographe.nom} — ${specialty} Photographer${location}`;
    const generatedDescription =
      portfolio.slogan ||
      portfolio.seo.metaDescription ||
      `Discover the photography portfolio of ${portfolio.photographe.prenom} ${portfolio.photographe.nom}, ${specialty} photographer${location}.`;
    return {
      title: portfolio.seo.metaTitre || generatedTitle,
      description: portfolio.seo.metaDescription || generatedDescription,
      openGraph: {
        title: portfolio.seo.metaTitre || generatedTitle,
        description: portfolio.seo.metaDescription || generatedDescription,
        images: portfolio.seo.imageOG
          ? [{ url: portfolio.seo.imageOG }]
          : [{ url: portfolio.photoCouverture }],
        type: "profile",
      },
    };
  }

  return {
    title: "Portfolio Unavailable — StudioFlow",
    description: "This portfolio is not published yet.",
    robots: { index: false, follow: false },
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPortfolioForPublicRoute(slug);

  if (result.status === "PUBLISHED") {
    return (
      <PortfolioPageReveal slug={slug}>
        <PortfolioPublicContent portfolio={result.portfolio} />
      </PortfolioPageReveal>
    );
  }

  notFound();
}
