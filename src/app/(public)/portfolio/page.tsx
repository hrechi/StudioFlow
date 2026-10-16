/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/shared/reveal";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { PORTFOLIOS_PUBLICS } from "@/modules/portfolio/mock-data";
import { categoriePortfolioLabels } from "@/modules/portfolio/portfolio.types";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Weddings, portraits, products and events: a selection of the studio's work.",
};

export default function PortfolioPage() {
  const [first, ...others] = PORTFOLIOS_PUBLICS;
  return (
    <main className="pt-18">
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <p className="text-xs font-semibold tracking-[0.3em] text-white/60 uppercase">
            Portfolio
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Images that tell your most precious moments.
          </h1>
          <p className="mt-6 max-w-xl text-white/70">
            A selection of our sessions, published with our clients&apos; consent.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-5 lg:grid-cols-2">
          {first && <CategoryCard portfolio={first} large />}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {others.map((portfolio, index) => (
              <Reveal key={portfolio.id} delay={index * 80}>
                <CategoryCard portfolio={portfolio} />
              </Reveal>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-charcoal">Your story deserves to be told.</p>
          <Button asChild size="lg">
            <Link href="/register">Book a session</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function CategoryCard({
  portfolio,
  large = false,
}: {
  portfolio: (typeof PORTFOLIOS_PUBLICS)[number];
  large?: boolean;
}) {
  return (
    <Link
      href={`/portfolio/${portfolio.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-charcoal ${large ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[36rem]" : "aspect-[4/3]"}`}
    >
      <SafeImage
        src={portfolio.photoCouverture}
        alt=""
        fill
        sizes={large ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1280px) 25vw, 50vw"}
        className="object-cover opacity-90 transition-transform duration-[1.2s] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-white/70 uppercase">
            {categoriePortfolioLabels[portfolio.categorie]} · {portfolio.elements.length} photos
          </p>
          <h2 className={`mt-1 font-bold text-white ${large ? "text-3xl" : "text-xl"}`}>
            {portfolio.titre}
          </h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors group-hover:bg-white group-hover:text-charcoal">
          <ArrowUpRight className="size-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
