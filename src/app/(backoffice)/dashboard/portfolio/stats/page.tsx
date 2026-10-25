import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { PortfolioStatsInsights } from "@/modules/portfolio/components/portfolio-stats-insights";
import { getPortfolioStats, listPortfoliosForOwner } from "@/modules/portfolio/portfolio.service";

export const metadata: Metadata = { title: "Portfolio statistics" };

export default async function PortfolioStatsPage() {
  const user = await requireRole("PHOTOGRAPHE");
  const [portfolio] = await listPortfoliosForOwner(user.id);
  if (!portfolio)
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        Create a portfolio to see its statistics.
      </div>
    );
  const stats = await getPortfolioStats(portfolio.id, user.id);
  const maxViews = Math.max(1, ...stats.jours.map((day) => day.vues));
  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio statistics" description={portfolio.titre} />
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat title="Total views" value={stats.totalVues} />
        <Stat title="Unique visitors · 30 days" value={stats.visiteursUniques} />
        <Stat title="Contact clicks · 30 days" value={stats.clicsContact} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Views over the last 30 days</h2>
        <ol className="mt-6 flex h-56 items-end gap-1" aria-label="Daily portfolio views chart">
          {stats.jours.map((day) => (
            <li
              key={day.date}
              title={`${day.date}: ${day.vues} views`}
              className="flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.max(2, (day.vues / maxViews) * 100)}%` }}
                aria-label={`${day.date}: ${day.vues} views`}
              />
            </li>
          ))}
        </ol>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{stats.jours[0]?.date}</span>
          <span>{stats.jours.at(-1)?.date}</span>
        </div>
      </section>
      <PortfolioStatsInsights portfolioId={portfolio.id} />
      <Link
        href="/dashboard/portfolio/demandes"
        className="text-sm font-medium text-primary-text underline"
      >
        View contact requests
      </Link>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{new Intl.NumberFormat().format(value)}</p>
    </div>
  );
}
