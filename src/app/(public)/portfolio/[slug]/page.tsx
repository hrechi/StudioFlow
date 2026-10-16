/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PortfolioGallery } from "@/modules/portfolio/components/portfolio-gallery";
import { getPortfolioBySlug, PORTFOLIOS_PUBLICS } from "@/modules/portfolio/mock-data";
import { categoriePortfolioLabels } from "@/modules/portfolio/portfolio.types";

export async function generateMetadata({
  params,
}: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = getPortfolioBySlug(slug);
  return { title: portfolio?.titre ?? "Portfolio", description: portfolio?.description };
}

export default async function PortfolioCollectionPage({ params }: PageProps<"/portfolio/[slug]">) {
  const { slug } = await params;
  const portfolio = getPortfolioBySlug(slug);
  if (!portfolio) notFound();
  // Featured items first, then the display order chosen in the backoffice.
  const elements = [...portfolio.elements].sort(
    (a, b) =>
      Number(b.estMisEnAvant) - Number(a.estMisEnAvant) || a.ordreAffichage - b.ordreAffichage,
  );
  const others = PORTFOLIOS_PUBLICS.filter((p) => p.id !== portfolio.id);

  return (
    <main className="pt-18">
      <section className="mx-auto max-w-7xl px-5 pt-12 pb-10 sm:px-8 lg:pt-16">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Portfolio
        </Link>
        <p className="mt-8 text-xs font-semibold tracking-[0.3em] text-primary-text uppercase">
          {categoriePortfolioLabels[portfolio.categorie]}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">
          {portfolio.titre}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{portfolio.description}</p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <PortfolioGallery elements={elements} titre={portfolio.titre} />
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-14 sm:px-8">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Other collections
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((p) => (
              <Button key={p.id} asChild variant="outline" className="rounded-full bg-white">
                <Link href={`/portfolio/${p.slug}`}>{p.titre}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
