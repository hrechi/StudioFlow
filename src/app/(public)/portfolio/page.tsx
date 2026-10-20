/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/shared/reveal";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PORTFOLIOS_PUBLICS } from "@/modules/portfolio/mock-data";
import { categoriePortfolioLabels } from "@/modules/portfolio/portfolio.types";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Weddings, portraits, products and events: a selection of the studio's work.",
};

export default function PortfolioPage() {
  const [first, ...others] = PORTFOLIOS_PUBLICS;
  return (
    <main>
      <section className="relative overflow-hidden pt-40 pb-20 lg:pt-52 lg:pb-28">
        {first && (
          <div className="absolute inset-0 opacity-30">
            <SafeImage
              src={first.photoCouverture}
              alt=""
              fill
              priority
              sizes="100vw"
              className="ken-burns object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/80 to-ink" />
        <div className="container-wide relative">
          <p className="eyebrow page-enter">Portfolio</p>
          <h1 className="display-xl page-enter mt-6 max-w-5xl text-bone [animation-delay:120ms]">
            Images that tell your story.
          </h1>
          <p className="page-enter mt-8 max-w-xl text-bone/65 [animation-delay:240ms]">
            A selection of our sessions, published with our clients&apos; consent.
          </p>
        </div>
      </section>

      <section className="container-wide pb-24 lg:pb-32">
        <ul className="grid gap-4 lg:grid-cols-2">
          {first && (
            <li className="lg:row-span-2">
              <CollectionCard portfolio={first} index={0} large />
            </li>
          )}
          {others.map((portfolio, index) => (
            <Reveal key={portfolio.id} as="li" delay={(index % 2) * 100}>
              <CollectionCard portfolio={portfolio} index={index + 1} />
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-24 flex flex-col items-center gap-8 text-center">
          <p className="display-md text-bone">Your story deserves to be told.</p>
          <Button asChild variant="cinematic" size="cta">
            <Link href="/register">
              Book a session
              <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </section>
    </main>
  );
}

function CollectionCard({
  portfolio,
  index,
  large = false,
}: {
  portfolio: (typeof PORTFOLIOS_PUBLICS)[number];
  index: number;
  large?: boolean;
}) {
  return (
    <Link
      href={`/portfolio/${portfolio.slug}`}
      className={cn(
        "group relative block overflow-hidden bg-card",
        large ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[40rem]" : "aspect-[16/10]",
      )}
    >
      <SafeImage
        src={portfolio.photoCouverture}
        alt=""
        fill
        sizes={large ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
        className="img-zoom object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent transition-colors duration-700 group-hover:via-ink/40" />
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <span className="font-heading text-xs tracking-[0.3em] text-bone/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[0.65rem] tracking-[0.3em] text-bone/60 uppercase">
              {categoriePortfolioLabels[portfolio.categorie]} · {portfolio.elements.length} photos
            </p>
            <h2 className={cn("mt-3 text-bone", large ? "display-lg" : "display-md")}>
              {portfolio.titre}
            </h2>
          </div>
          <span className="grid size-12 shrink-0 place-items-center border border-bone/30 text-bone transition-colors duration-500 group-hover:border-bone group-hover:bg-bone group-hover:text-ink">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
