/* Module : Gestion des Séances · Responsable : Yosser Rafrafi — Statistiques (cahier §3.14) */
import {
  Banknote,
  CalendarDays,
  CalendarX2,
  Clock,
  ClipboardList,
  Info,
  Layers,
  Lightbulb,
  Percent,
  Receipt,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/guards";
import { cn, formatDate } from "@/lib/utils";
import { formatTND } from "@/modules/facturation/facturation.utils";
import {
  ColumnChart,
  Delta,
  DonutChart,
  TrendChart,
  CHART_COLORS,
} from "@/modules/seances/components/stats-charts";
import { StatsBarList } from "@/modules/seances/components/stats-bar-list";
import { statutSeanceConfig } from "@/modules/seances/seance.types";
import { lirePeriode } from "@/modules/seances/stats.rules";
import { getStatistiques } from "@/modules/seances/stats.service";
import { PERIODES_STATS, periodeStatsLabels, type Recommandation } from "@/modules/seances/stats.types";
import { prioriteConfig } from "@/modules/seances/tache.dto";

export const metadata: Metadata = { title: "Statistics" };

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);
const JOURS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUT_COLORS: Record<string, string> = {
  PLANIFIEE: "var(--warning)",
  CONFIRMEE: "#3b82f6",
  EN_COURS: "var(--ai)",
  TERMINEE: "var(--success)",
  ANNULEE: "var(--destructive)",
  REPORTEE: "#94a3b8",
  DEMANDE_RECUE: "var(--ai)",
};

function mois(label: string): string {
  const [y, m] = label.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Millimes → short axis label ("1.2k" TND). Exact amounts stay in tooltips and KPI cards. */
function compactTND(millimes: number): string {
  const t = millimes / 1000;
  return t >= 1000 ? `${Math.round(t / 100) / 10}k` : String(Math.round(t));
}

// ── Building blocks ──────────────────────────────────────────────────────────

type KpiConfig = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  gradient: string;
  iconBg: string;
  valueColor?: string;
  delta?: ReactNode;
};

function KpiCard({ label, value, icon: Icon, hint, gradient, iconBg, valueColor, delta }: KpiConfig) {
  return (
    <Card className="relative overflow-hidden p-0">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={cn("mt-1.5 text-3xl font-bold tracking-tight tabular-nums", valueColor ?? "text-foreground")}>
              {value}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {delta}
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
          </div>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
      </div>
    </Card>
  );
}

function RateRing({ value, color, label }: { value: number | null; color: string; label: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = ((value ?? 0) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums">
          {pct(value)}
        </span>
      </div>
      <p className="text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  sub,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex size-8 items-center justify-center rounded-lg", accent)}>
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const NIVEAU_STYLE: Record<Recommandation["niveau"], { icon: LucideIcon; box: string }> = {
  attention: { icon: TriangleAlert, box: "bg-destructive/10 text-destructive-text" },
  opportunite: { icon: Lightbulb, box: "bg-warning/15 text-warning-text" },
  info: { icon: Info, box: "bg-primary/10 text-primary-text" },
};

function Insights({ items }: { items: Recommandation[] }) {
  return (
    <section className="space-y-4" aria-label="Insights">
      <SectionHeading
        icon={Lightbulb}
        title="Insights"
        sub="Suggestions computed from the figures below. The decisions stay yours."
        accent="bg-warning/15 text-warning-text"
      />
      {items.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          Nothing to flag for this period: no late tasks, no unusual rate, no quiet month.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((r) => {
            const { icon: Icon, box } = NIVEAU_STYLE[r.niveau];
            return (
              <Card key={r.id} className="flex items-start gap-4 p-4">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", box)}>
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{r.titre}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{r.detail}</p>
                  {r.lien && (
                    <Link
                      href={r.lien.href}
                      className="mt-2 inline-block text-xs font-medium text-primary-text underline underline-offset-2"
                    >
                      {r.lien.label} →
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  await requireRole("ADMIN");
  const code = lirePeriode((await searchParams).periode);
  const { periode, precedent, recommandations, seances, taches, facturation: fact } = await getStatistiques(code);
  const m = fact.montants;
  const heuresTotal = seances.charge.reduce((a, c) => a + c.heures, 0);
  const maxHeures = Math.max(1, ...seances.charge.map((c) => c.heures));
  const termineesPct =
    seances.total > 0
      ? Math.round(((seances.total - seances.taux.annulees - seances.taux.reportees) / seances.total) * 100)
      : 0;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Statistics"
        description={
          `${periode.label} · ` +
          `${formatDate(new Date(Date.parse(periode.from) + 3_600_000))} → ` +
          `${formatDate(new Date(Date.parse(periode.to) - 1))}`
        }
      />

      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODES_STATS.map((p) => (
          <Link
            key={p}
            href={`/dashboard/statistiques?periode=${p}`}
            aria-current={p === code ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
              p === code
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-slate hover:border-primary/40 hover:bg-accent",
            )}
          >
            {periodeStatsLabels[p]}
          </Link>
        ))}
      </nav>

      {/* ── Key figures (with comparison to the previous period) ───── */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total sessions"
          value={seances.total}
          icon={CalendarDays}
          hint={precedent ? `vs ${precedent.total} before` : `${seances.parType.length} event type${seances.parType.length !== 1 ? "s" : ""}`}
          delta={<Delta actuel={seances.total} precedent={precedent?.total} />}
          gradient="from-primary to-primary/40"
          iconBg="bg-primary/10 text-primary-text"
        />
        <KpiCard
          label="Cancellation rate"
          value={pct(seances.taux.tauxAnnulation)}
          icon={CalendarX2}
          hint={`${seances.taux.annulees} cancelled`}
          delta={<Delta kind="pts" goodWhen="down" actuel={seances.taux.tauxAnnulation} precedent={precedent?.tauxAnnulation} />}
          gradient="from-destructive to-destructive/40"
          iconBg="bg-destructive/10 text-destructive-text"
          valueColor={seances.taux.tauxAnnulation && seances.taux.tauxAnnulation > 15 ? "text-destructive-text" : undefined}
        />
        <KpiCard
          label="Postponement rate"
          value={pct(seances.taux.tauxReport)}
          icon={Percent}
          hint={`${seances.taux.reportees} postponed`}
          delta={<Delta kind="pts" goodWhen="down" actuel={seances.taux.tauxReport} precedent={precedent?.tauxReport} />}
          gradient="from-warning to-warning/40"
          iconBg="bg-warning/10 text-warning-text"
        />
        <KpiCard
          label="Late tasks"
          value={taches.enRetard}
          icon={TriangleAlert}
          hint={`${taches.ouvertes} open in total`}
          gradient={taches.enRetard > 0 ? "from-destructive to-destructive/40" : "from-success to-success/40"}
          iconBg={taches.enRetard > 0 ? "bg-destructive/10 text-destructive-text" : "bg-success/10 text-success-text"}
          valueColor={taches.enRetard > 0 ? "text-destructive-text" : "text-success-text"}
        />
      </section>

      <Insights items={recommandations} />

      {/* ── Activity ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading icon={CalendarDays} title="Activity" accent="bg-primary/10 text-primary-text" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <p className="text-sm font-medium text-foreground">Sessions per month</p>
            <TrendChart
              id="seances-mois"
              label="Number of sessions per month"
              points={seances.parMois.map((x) => ({ label: mois(x.mois), value: x.total }))}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">By status</p>
            <DonutChart
              label="Sessions by status"
              centerValue={seances.total}
              centerLabel="sessions"
              slices={seances.parStatut.map((s) => ({
                label: statutSeanceConfig[s.statut as keyof typeof statutSeanceConfig]?.label ?? s.statut,
                value: s.total,
                color: STATUT_COLORS[s.statut],
              }))}
            />
          </Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <p className="text-sm font-medium text-foreground">By event type</p>
            <StatsBarList
              items={seances.parType.map((t) => ({
                label: t.nom,
                value: t.total,
                hint: t.annulees > 0 ? `${t.annulees} cancelled` : undefined,
              }))}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-medium text-foreground">Busiest weekdays</p>
              <p className="text-xs text-muted-foreground">Confirmed and completed sessions</p>
            </div>
            <ColumnChart
              label="Sessions by weekday"
              items={seances.parJourSemaine.map((value, i) => ({ label: JOURS[i], value }))}
            />
          </Card>
        </div>
      </section>

      {/* ── Packs & rates ────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading icon={Layers} title="Packs & rates" accent="bg-chart-4/10 text-chart-4" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-5 p-5">
            <div>
              <p className="text-sm font-medium text-foreground">Most requested packs</p>
              <p className="text-xs text-muted-foreground">
                {seances.packs.avecPack} with a pack · {seances.packs.sansPack} custom
              </p>
            </div>
            <StatsBarList
              items={seances.packs.top.map((p) => ({ label: p.nom, value: p.total }))}
              tone="from-[#8b6fcb] to-[#8b6fcb]/60"
            />
            {seances.packsSansDemande.length > 0 && (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">No request this period: </span>
                {seances.packsSansDemande.map((p) => p.nom).join(", ")}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-5 text-sm font-medium text-foreground">Cancellation & postponement</p>
            <div className="flex items-center justify-around gap-4">
              <RateRing value={seances.taux.tauxAnnulation} color="text-destructive" label={`${seances.taux.annulees} cancelled`} />
              <RateRing value={seances.taux.tauxReport} color="text-warning" label={`${seances.taux.reportees} postponed`} />
              <RateRing value={seances.total > 0 ? termineesPct : null} color="text-success" label="neither cancelled nor postponed" />
            </div>
          </Card>
        </div>
      </section>

      {/* ── Team workload ────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={Users}
          title="Team workload"
          sub="Sessions and hours in the period. Tasks counted as of today."
          accent="bg-success/10 text-success-text"
        />
        <Card className="overflow-x-auto p-0">
          {seances.charge.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No team activity for this period.</p>
          ) : (
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-5 py-3">Team member</th>
                  <th scope="col" className="px-4 py-3 text-right">Sessions</th>
                  <th scope="col" className="w-48 px-4 py-3">Hours</th>
                  <th scope="col" className="px-4 py-3 text-right">Open tasks</th>
                  <th scope="col" className="px-5 py-3 text-right">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {seances.charge.map((c) => (
                  <tr key={c.employe.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-text">
                          {c.employe.nom.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-medium text-foreground">{c.employe.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{c.seances}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(c.heures > 0 ? 4 : 0, Math.round((c.heures / maxHeures) * 100))}%` }} />
                        </div>
                        <span className="w-14 text-right text-xs tabular-nums">
                          <span className="font-semibold text-foreground">{c.heures}</span> h
                          {heuresTotal > 0 && <span className="text-muted-foreground"> · {Math.round((c.heures / heuresTotal) * 100)}%</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.tachesOuvertes}</td>
                    <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", c.tachesEnRetard > 0 ? "text-destructive-text" : "text-muted-foreground")}>
                      {c.tachesEnRetard > 0 ? `⚠ ${c.tachesEnRetard}` : c.tachesEnRetard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* ── Late tasks ───────────────────────────────────────────── */}
      {taches.plusAnciennes.length > 0 && (
        <section className="space-y-4">
          <SectionHeading icon={Clock} title={`Late tasks (${taches.enRetard})`} accent="bg-destructive/10 text-destructive-text" />
          <div className="grid gap-3 sm:grid-cols-2">
            {taches.plusAnciennes.map((t) => (
              <Card key={t.id} className="flex items-start gap-4 p-4">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-xs font-bold text-destructive-text">
                  {t.joursRetard}d
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.titre}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <Link href={`/dashboard/seances/${t.seance.id}`} className="underline hover:text-foreground">
                      {t.seance.titre}
                    </Link>
                    {t.employe && ` · ${t.employe}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(t.dateLimite)}</p>
                </div>
                <ToneBadge tone={prioriteConfig[t.priorite].tone} label={prioriteConfig[t.priorite].label} />
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Revenue ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={Wallet}
          title="Revenue"
          sub="From Billing: quotes, invoices and payments, amounts incl. VAT."
          accent="bg-success/10 text-success-text"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Accepted quotes"
            value={formatTND(m.devisAcceptesTTC)}
            icon={Receipt}
            hint={`${fact.devis.acceptes} of ${fact.devis.emis} quotes`}
            gradient="from-primary to-primary/40"
            iconBg="bg-primary/10 text-primary-text"
          />
          <KpiCard
            label="Collected"
            value={formatTND(m.encaisse)}
            icon={Wallet}
            hint={`Invoiced ${formatTND(m.factureTTC)}`}
            gradient="from-success to-success/40"
            iconBg="bg-success/10 text-success-text"
            valueColor="text-success-text"
          />
          <KpiCard
            label="Overdue"
            value={formatTND(m.impayeEnRetard)}
            icon={ClipboardList}
            hint={`${m.factureEnRetard} invoice${m.factureEnRetard !== 1 ? "s" : ""} past due`}
            gradient={m.impayeEnRetard > 0 ? "from-destructive to-destructive/40" : "from-success to-success/40"}
            iconBg={m.impayeEnRetard > 0 ? "bg-destructive/10 text-destructive-text" : "bg-success/10 text-success-text"}
            valueColor={m.impayeEnRetard > 0 ? "text-destructive-text" : undefined}
          />
          <KpiCard
            label="Discounts"
            value={formatTND(m.remisesAccordees)}
            icon={Banknote}
            hint={m.remiseMoyennePct === null ? "No discount" : `${m.remiseMoyennePct}% avg on accepted`}
            gradient="from-warning to-warning/40"
            iconBg="bg-warning/10 text-warning-text"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <p className="text-sm font-medium text-foreground">Collected per month (TND)</p>
            <TrendChart
              id="encaisse-mois"
              label="Amount collected per month"
              color={CHART_COLORS[1]}
              format={compactTND}
              formatFull={formatTND}
              points={fact.parMois.map((x) => ({ label: mois(x.mois), value: x.encaisse }))}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">Accepted quotes by event type</p>
            <DonutChart
              label="Accepted quotes by event type"
              centerValue={fact.devis.acceptes}
              centerLabel="accepted"
              slices={fact.parTypeEvenement.map((t) => ({
                label: t.type,
                value: t.montantTTC,
                display: formatTND(t.montantTTC),
              }))}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
