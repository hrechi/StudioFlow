/* Module : Gestion des Séances · Responsable : Yosser Rafrafi — Statistiques (cahier §3.14) */
import {
  Banknote,
  CalendarDays,
  CalendarX2,
  ClipboardList,
  Percent,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ToneBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/guards";
import { cn, formatDate } from "@/lib/utils";
import { formatTND } from "@/modules/facturation/facturation.utils";
import { StatsBarList } from "@/modules/seances/components/stats-bar-list";
import { lirePeriode } from "@/modules/seances/stats.rules";
import { getStatistiques } from "@/modules/seances/stats.service";
import { PERIODES_STATS, periodeStatsLabels } from "@/modules/seances/stats.types";
import { prioriteConfig } from "@/modules/seances/tache.dto";

export const metadata: Metadata = { title: "Statistics" };

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);

function mois(label: string): string {
  const [y, m] = label.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  await requireRole("ADMIN");
  const code = lirePeriode((await searchParams).periode);
  const { periode, seances, taches, facturation: fact } = await getStatistiques(code);
  const m = fact.montants;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistics"
        description={`${periode.label} · ${formatDate(new Date(Date.parse(periode.from) + 3_600_000))} to ${formatDate(new Date(Date.parse(periode.to) - 1))}. Amounts come from Billing.`}
      />

      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODES_STATS.map((p) => (
          <Link
            key={p}
            href={`/dashboard/statistiques?periode=${p}`}
            aria-current={p === code ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              p === code ? "border-primary bg-primary text-primary-foreground" : "bg-card text-slate hover:bg-muted",
            )}
          >
            {periodeStatsLabels[p]}
          </Link>
        ))}
      </nav>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions" value={seances.total} icon={CalendarDays} />
        <StatCard
          label="Cancellation rate"
          value={pct(seances.taux.tauxAnnulation)}
          icon={CalendarX2}
          tone="red"
          hint={`${seances.taux.annulees} cancelled`}
        />
        <StatCard
          label="Postponement rate"
          value={pct(seances.taux.tauxReport)}
          icon={Percent}
          tone="amber"
          hint={`${seances.taux.reportees} postponed`}
        />
        <StatCard
          label="Late tasks"
          value={taches.enRetard}
          icon={TriangleAlert}
          tone={taches.enRetard > 0 ? "red" : "green"}
          hint={`${taches.ouvertes} open in total`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold text-foreground">Sessions by event type</h2>
          <StatsBarList
            items={seances.parType.map((t) => ({
              label: t.nom,
              value: t.total,
              hint: t.annulees > 0 ? `${t.annulees} cancelled` : undefined,
            }))}
          />
        </Card>
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold text-foreground">Sessions by month</h2>
          <StatsBarList items={seances.parMois.map((x) => ({ label: mois(x.mois), value: x.total }))} />
        </Card>
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-semibold text-foreground">Most requested packs</h2>
            <p className="text-xs text-muted-foreground">
              {seances.packs.avecPack} session(s) with a pack, {seances.packs.sansPack} custom.
            </p>
          </div>
          <StatsBarList items={seances.packs.top.map((p) => ({ label: p.nom, value: p.total }))} />
        </Card>
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-semibold text-foreground">Cancellations & postponements</h2>
            <p className="text-xs text-muted-foreground">
              Pending requests are not counted. Postponed = currently postponed or moved since this was tracked.
            </p>
          </div>
          <StatsBarList
            tone="bg-warning"
            items={[
              { label: "Cancelled", value: seances.taux.annulees, display: `${seances.taux.annulees} · ${pct(seances.taux.tauxAnnulation)}` },
              { label: "Postponed", value: seances.taux.reportees, display: `${seances.taux.reportees} · ${pct(seances.taux.tauxReport)}` },
            ]}
            empty="No cancelled or postponed session in this period."
          />
        </Card>
      </div>

      <section aria-labelledby="charge" className="space-y-3">
        <div>
          <h2 id="charge" className="font-semibold text-foreground">
            Workload per team member
          </h2>
          <p className="text-xs text-muted-foreground">
            Sessions and hours in the period (cancelled sessions excluded). Tasks are counted as of today.
          </p>
        </div>
        <Card className="overflow-x-auto p-0">
          {seances.charge.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No team activity for this period.</p>
          ) : (
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Team member</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sessions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-right font-medium">Open tasks</th>
                  <th className="px-4 py-2.5 text-right font-medium">Late tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {seances.charge.map((c) => (
                  <tr key={c.employe.id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{c.employe.nom}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.seances}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.heures} h</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.tachesOuvertes}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        c.tachesEnRetard > 0 && "font-semibold text-destructive-text",
                      )}
                    >
                      {c.tachesEnRetard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section aria-labelledby="retard" className="space-y-3">
        <h2 id="retard" className="font-semibold text-foreground">
          Late tasks ({taches.enRetard})
        </h2>
        <Card className="divide-y p-0">
          {taches.plusAnciennes.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No task is late.</p>
          ) : (
            taches.plusAnciennes.map((t) => (
              <div key={t.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    <Link href={`/dashboard/seances/${t.seance.id}`} className="underline">
                      {t.seance.titre}
                    </Link>{" "}
                    · {t.employe ?? "Unassigned"} · due {formatDate(t.dateLimite)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ToneBadge tone={prioriteConfig[t.priorite].tone} label={prioriteConfig[t.priorite].label} />
                  <span className="text-xs font-semibold text-destructive-text">
                    {t.joursRetard} day{t.joursRetard > 1 ? "s" : ""} late
                  </span>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>

      <section aria-labelledby="montants" className="space-y-4">
        <div>
          <h2 id="montants" className="font-semibold text-foreground">
            Revenue
          </h2>
          <p className="text-xs text-muted-foreground">
            Read from Billing (quotes, invoices and recorded payments), amounts incl. VAT.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Accepted quotes"
            value={formatTND(m.devisAcceptesTTC)}
            icon={Receipt}
            hint={`${fact.devis.acceptes} of ${fact.devis.emis} quotes`}
          />
          <StatCard label="Collected" value={formatTND(m.encaisse)} icon={Wallet} tone="green" hint={`Invoiced ${formatTND(m.factureTTC)}`} />
          <StatCard
            label="Overdue"
            value={formatTND(m.impayeEnRetard)}
            icon={ClipboardList}
            tone={m.impayeEnRetard > 0 ? "red" : "green"}
            hint={`${m.factureEnRetard} invoice(s) past due, as of today`}
          />
          <StatCard
            label="Discounts granted"
            value={formatTND(m.remisesAccordees)}
            icon={Banknote}
            tone="amber"
            hint={m.remiseMoyennePct === null ? "No discount" : `${m.remiseMoyennePct}% of accepted quotes`}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold text-foreground">Accepted quotes by event type</h3>
            <StatsBarList
              items={fact.parTypeEvenement.map((t) => ({
                label: t.type,
                value: t.montantTTC,
                display: formatTND(t.montantTTC),
                hint: `${t.devisAcceptes} quote${t.devisAcceptes > 1 ? "s" : ""}`,
              }))}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold text-foreground">Collected by month</h3>
            <StatsBarList
              tone="bg-success"
              items={fact.parMois.map((x) => ({ label: mois(x.mois), value: x.encaisse, display: formatTND(x.encaisse) }))}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
