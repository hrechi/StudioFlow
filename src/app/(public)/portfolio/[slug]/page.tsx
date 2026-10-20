/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/shared/safe-image";
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
    <main>
      <section className="dark relative flex min-h-[70vh] items-end overflow-hidden bg-background">
        <SafeImage
          src={portfolio.photoCouverture}
          alt=""
          fill
          priority
          sizes="100vw"
          className="ken-burns object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/40" />
        <div className="container-wide relative pt-40 pb-16">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-[0.65rem] tracking-[0.3em] text-foreground/70 uppercase transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Portfolio
          </Link>
          <p className="eyebrow mt-10">{categoriePortfolioLabels[portfolio.categorie]}</p>
          <h1 className="display-xl mt-5 max-w-5xl text-foreground">{portfolio.titre}</h1>
          <p className="mt-6 max-w-2xl text-foreground/70">{portfolio.description}</p>
        </div>
      </section>

      <section className="container-wide py-16 lg:py-24">
        <PortfolioGallery elements={elements} titre={portfolio.titre} />
      </section>

      <section className="border-t border-foreground/[0.06]">
        <div className="container-wide py-20">
          <p className="eyebrow text-center">Other collections</p>
          <ul className="mt-10 grid gap-px bg-foreground/[0.07] sm:grid-cols-2 lg:grid-cols-4">
            {others.map((p) => (
              <li key={p.id} className="bg-background">
                <Link
                  href={`/portfolio/${p.slug}`}
                  className="dark group relative block aspect-[4/3] overflow-hidden bg-background"
                >
                  <SafeImage
                    src={p.photoCouverture}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="img-zoom object-cover opacity-60 transition-opacity duration-700 group-hover:opacity-80"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-5 font-heading text-xs font-medium tracking-[0.22em] text-foreground uppercase">
                    {p.titre}
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
