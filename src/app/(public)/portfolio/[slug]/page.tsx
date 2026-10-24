import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPortfolio } from "@/modules/portfolio/portfolio.service";
import { PortfolioPublicContent } from "@/modules/portfolio/components/portfolio-public-content";

export async function generateMetadata({ params }: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) return { title: "Portfolio unavailable" };
  return {
    title: portfolio.seo.metaTitre || portfolio.titre,
    description: portfolio.seo.metaDescription || portfolio.slogan || portfolio.bio,
    openGraph: {
      title: portfolio.seo.metaTitre || portfolio.titre,
      description: portfolio.seo.metaDescription || portfolio.slogan,
      images: portfolio.seo.imageOG ? [{ url: portfolio.seo.imageOG }] : [portfolio.photoCouverture],
      type: "profile",
    },
  };
}

export default async function PortfolioPage({ params }: PageProps<"/portfolio/[slug]">) {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) notFound();
  return <PortfolioPublicContent portfolio={portfolio} />;
}
