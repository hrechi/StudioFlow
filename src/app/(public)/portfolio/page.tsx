import type { Metadata } from "next";
import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { CATEGORIES_PORTFOLIO, categoriePortfolioLabels } from "@/modules/portfolio/portfolio.types";
import { listPublicPortfolios } from "@/modules/portfolio/portfolio.service";

export const metadata: Metadata = {
  title: "Photographer portfolios",
  description: "Browse published photography portfolios by specialty and city.",
};

type Search = { categorie?: string; ville?: string; page?: string };

export default async function PortfolioDirectoryPage({ searchParams }: PageProps<"/portfolio">) {
  const search = (await searchParams) as Search;
  const categorie = CATEGORIES_PORTFOLIO.find((item) => item === search.categorie);
  const page = Math.max(1, Number.parseInt(search.page ?? "1", 10) || 1);
  const result = await listPublicPortfolios({ categorie, ville: search.ville?.trim() || undefined, page });

  return (
    <main className="min-h-screen pb-24">
      <section className="relative overflow-hidden pt-40 pb-14 lg:pt-52">
        <div className="container-wide">
          <p className="eyebrow">Portfolio directory</p>
          <h1 className="display-xl mt-5 max-w-5xl text-foreground">Photographers and their work</h1>
          <p className="mt-6 max-w-2xl text-foreground/65">
            Explore published portfolios and find the right style for your next session.
          </p>
        </div>
      </section>

      <section className="container-wide">
        <form method="get" className="mb-10 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Specialty</span>
            <select name="categorie" defaultValue={categorie ?? ""} className="h-10 min-w-44 rounded-lg border border-border bg-background px-3">
              <option value="">All specialties</option>
              {CATEGORIES_PORTFOLIO.map((item) => <option key={item} value={item}>{categoriePortfolioLabels[item]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">City</span>
            <input name="ville" defaultValue={search.ville ?? ""} maxLength={120} className="h-10 rounded-lg border border-border bg-background px-3" placeholder="Tunis" />
          </label>
          <Button type="submit">Filter portfolios</Button>
        </form>

        {result.items.length ? (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((portfolio) => (
                <li key={portfolio.id}>
                  <Link href={`/portfolio/${portfolio.slug}`} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lift">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <SafeImage src={portfolio.photoCouverture} alt="" fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="space-y-2 p-5">
                      <p className="text-xs font-semibold tracking-wide text-primary-text uppercase">{portfolio.specialites.map((item) => categoriePortfolioLabels[item]).join(" · ")}</p>
                      <h2 className="text-xl font-semibold text-foreground group-hover:text-primary-text">{portfolio.titre}</h2>
                      <p className="text-sm text-muted-foreground">{portfolio.photographe.prenom} {portfolio.photographe.nom}{portfolio.ville ? ` · ${portfolio.ville}` : ""}</p>
                      {portfolio.slogan && <p className="line-clamp-2 text-sm text-foreground/70">{portfolio.slogan}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <nav aria-label="Portfolio pages" className="mt-10 flex items-center justify-center gap-4">
              {result.page > 1 && <Button asChild variant="outline"><Link href={directoryHref(search, result.page - 1)}>Previous</Link></Button>}
              <span className="text-sm text-muted-foreground">Page {result.page} of {result.pageCount}</span>
              {result.page < result.pageCount && <Button asChild variant="outline"><Link href={directoryHref(search, result.page + 1)}>Next</Link></Button>}
            </nav>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">No portfolios match those filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another specialty or city.</p>
            <Button asChild variant="outline" className="mt-5"><Link href="/portfolio">Clear filters</Link></Button>
          </div>
        )}
      </section>
    </main>
  );
}

function directoryHref(search: Search, page: number): string {
  const params = new URLSearchParams();
  if (search.categorie) params.set("categorie", search.categorie);
  if (search.ville) params.set("ville", search.ville);
  params.set("page", String(page));
  return `/portfolio?${params.toString()}`;
}
