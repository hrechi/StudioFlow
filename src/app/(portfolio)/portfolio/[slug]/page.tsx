import type { Metadata } from "next";
import { getPortfolioForPublicRoute } from "@/modules/portfolio/portfolio.service";
import { PortfolioPublicContent } from "@/modules/portfolio/components/portfolio-public-content";
import { PortfolioUnpublishedView } from "@/modules/portfolio/components/public/PortfolioUnpublishedView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPortfolioForPublicRoute(slug);

  if (result.status === "PUBLISHED") {
    const portfolio = result.portfolio;
    return {
      title: portfolio.seo.metaTitre || `${portfolio.titre} — Portfolio`,
      description: portfolio.seo.metaDescription || portfolio.slogan || portfolio.bio,
      openGraph: {
        title: portfolio.seo.metaTitre || portfolio.titre,
        description: portfolio.seo.metaDescription || portfolio.slogan,
        images: portfolio.seo.imageOG
          ? [{ url: portfolio.seo.imageOG }]
          : [{ url: portfolio.photoCouverture }],
        type: "profile",
      },
    };
  }

  return {
    title: "Portfolio unavailable — StudioFlow",
    description: "Ce portfolio n'est pas encore publié.",
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
    return <PortfolioPublicContent portfolio={result.portfolio} />;
  }

  if (result.status === "UNPUBLISHED") {
    return (
      <PortfolioUnpublishedView
        photographerName={result.photographeNom}
        isDraft={true}
      />
    );
  }

  // NOT_FOUND
  return (
    <PortfolioUnpublishedView
      photographerName="StudioFlow"
      isDraft={false}
    />
  );
}

