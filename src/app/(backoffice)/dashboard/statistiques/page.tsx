/* Module : Gestion des Séances · Responsable : Yosser Rafrafi — Statistiques (cahier §3.14) */
import {
  Banknote,
  CalendarDays,
  CalendarX2,
  Clock,
  ClipboardList,
  Layers,
  Percent,
  Receipt,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
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
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Statistics" };

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);

function mois(label: string): string {
  const [y, m] = label.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

// ── KPI card variants ────────────────────────────────────────────────────────

type KpiConfig = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  gradient: string;      // Tailwind gradient classes for the card accent
  iconBg: string;        // icon circle background
  valueColor?: string;
};

function KpiCard({ label, value, icon: Icon, hint, gradient, iconBg, valueColor }: KpiConfig) {
  return (
    <Card className="relative overflow-hidden p-0">
      {/* Accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={cn("mt-1.5 text-3xl font-bold tabular-nums tracking-tight", valueColor ?? "text-foreground")}>
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Rate ring (SVG donut) ─────────────────────────────────────────────────────

function RateRing({ pct: value, color, label }: { pct: number | null; color: string; label: string }) {
  const v = value ?? 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (v / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8"
          className="text-muted" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className={color} />
      </svg>
      <p className="text-lg font-bold tabular-nums text-foreground -mt-16">{pct(value)}</p>
      <p className="mt-10 text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, sub, accent }: {
  icon: LucideIcon; title: string; sub?: string; accent: string;
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

// ── Page ─────────────────────────────────────────────────────────────────────

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
    <div className="space-y-10">
      <PageHeader
        title="Statistics"
        description={
          `${periode.label} · ` +
          `${formatDate(new Date(Date.parse(periode.from) + 3_600_000))} → ` +
          `${formatDate(new Date(Date.parse(periode.to) - 1))}`
        }
      />

      {/* ── Period tabs ─────────────────────────────────────────────── */}
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

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total sessions"
          value={seances.total}
          icon={CalendarDays}
          hint={`across ${seances.parType.length} event type${seances.parType.length !== 1 ? "s" : ""}`}
          gradient="from-primary to-primary/40"
          iconBg="bg-primary/10 text-primary-text"
        />
        <KpiCard
          label="Cancellation rate"
          value={pct(seances.taux.tauxAnnulation)}
          icon={CalendarX2}
          hint={`${seances.taux.annulees} cancelled session${seances.taux.annulees !== 1 ? "s" : ""}`}
          gradient="from-destructive to-destructive/40"
          iconBg="bg-destructive/10 text-destructive-text"
          valueColor={seances.taux.tauxAnnulation && seances.taux.tauxAnnulation > 15 ? "text-destructive-text" : undefined}
        />
        <KpiCard
          label="Postponement rate"
          value={pct(seances.taux.tauxReport)}
          icon={Percent}
          hint={`${seances.taux.reportees} postponed`}
          gradient="from-warning to-warning/40"
          iconBg="bg-warning/10 text-warning-text"
        />
        <KpiCard
          label="Late tasks"
          value={taches.enRetard}
          icon={TriangleAlert}
          hint={`${taches.ouvertes} open total`}
          gradient={taches.enRetard > 0 ? "from-destructive to-destructive/40" : "from-success to-success/40"}
          iconBg={taches.enRetard > 0 ? "bg-destructive/10 text-destructive-text" : "bg-success/10 text-success-text"}
          valueColor={taches.enRetard > 0 ? "text-destructive-text" : "text-success-text"}
        />
      </section>

      {/* ── Sessions breakdown ──────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={CalendarDays}
          title="Sessions breakdown"
          accent="bg-primary/10 text-primary-text"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-5 p-5">
            <p className="text-sm font-medium text-foreground">By event type</p>
            <StatsBarList
              items={seances.parType.map((t) => ({
                label: t.nom,
                value: t.total,
                hint: t.annulees > 0 ? `${t.annulees} cancelled` : undefined,
              }))}
            />
          </Card>
          <Card className="space-y-5 p-5">
            <p className="text-sm font-medium text-foreground">By month</p>
            <StatsBarList
              items={seances.parMois.map((x) => ({
                label: mois(x.mois),
                value: x.total,
              }))}
              tone="from-[#8b6fcb] to-[#8b6fcb]/60"
            />
          </Card>
        </div>
      </section>

      {/* ── Packs + Rates ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={Layers}
          title="Packs & rates"
          accent="bg-[#8b6fcb]/10 text-[#8b6fcb]"
        />
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
          </Card>

          <Card className="p-5">
            <p className="mb-5 text-sm font-medium text-foreground">Cancellation & postponement</p>
            <div className="flex items-center justify-around gap-4">
              <RateRing
                pct={seances.taux.tauxAnnulation}
                color="text-destructive"
                label={`${seances.taux.annulees} cancelled`}
              />
              <div className="h-16 w-px bg-border" aria-hidden />
              <RateRing
                pct={seances.taux.tauxReport}
                color="text-warning"
                label={`${seances.taux.reportees} postponed`}
              />
              <div className="hidden h-16 w-px bg-border xl:block" aria-hidden />
              <div className="hidden flex-col items-center gap-1 xl:flex">
                <p className="text-3xl font-bold text-foreground">
                  {seances.total > 0
                    ? Math.round(((seances.total - seances.taux.annulees - seances.taux.reportees) / seances.total) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground text-center">completion<br/>rate</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Team workload ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={Users}
          title="Team workload"
          sub="Sessions and hours in the period. Tasks counted as of today."
          accent="bg-success/10 text-success-text"
        />
        <Card className="overflow-hidden p-0">
          {seances.charge.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No team activity for this period.</p>
          ) : (
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team member</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hours</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open tasks</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {seances.charge.map((c, i) => (
                  <tr key={c.employe.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-text">
                          {c.employe.nom.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-medium text-foreground">{c.employe.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{c.seances}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.heures}</span> h
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.tachesOuvertes}</td>
                    <td className={cn(
                      "px-5 py-3 text-right tabular-nums font-semibold",
                      c.tachesEnRetard > 0 ? "text-destructive-text" : "text-muted-foreground",
                    )}>
                      {c.tachesEnRetard > 0 ? `⚠ ${c.tachesEnRetard}` : c.tachesEnRetard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* ── Late tasks list ──────────────────────────────────────────── */}
      {taches.plusAnciennes.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={Clock}
            title={`Late tasks (${taches.enRetard})`}
            accent="bg-destructive/10 text-destructive-text"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {taches.plusAnciennes.map((t) => (
              <Card key={t.id} className="flex items-start gap-4 p-4">
                <div className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  "bg-destructive/10 text-destructive-text",
                )}>
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
                <ToneBadge
                  tone={prioriteConfig[t.priorite].tone}
                  label={prioriteConfig[t.priorite].label}
                />
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Revenue ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={Wallet}
          title="Revenue"
          sub="From Billing — quotes, invoices and payments, amounts incl. VAT."
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

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-5 p-5">
            <p className="text-sm font-medium text-foreground">Accepted quotes by event type</p>
            <StatsBarList
              items={fact.parTypeEvenement.map((t) => ({
                label: t.type,
                value: t.montantTTC,
                display: formatTND(t.montantTTC),
                hint: `${t.devisAcceptes} quote${t.devisAcceptes > 1 ? "s" : ""}`,
              }))}
              tone="from-success to-success/60"
            />
          </Card>
          <Card className="space-y-5 p-5">
            <p className="text-sm font-medium text-foreground">Collected by month</p>
            <StatsBarList
              items={fact.parMois.map((x) => ({
                label: mois(x.mois),
                value: x.encaisse,
                display: formatTND(x.encaisse),
              }))}
              tone="from-success to-success/60"
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
