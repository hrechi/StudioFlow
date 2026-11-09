/* Dashboard — module core · Charts of the home page (admin: the whole studio; photographer and
 * retoucher: their own work). Server-rendered SVG, same charts as the Statistics page. */
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { FactureAvecContexte } from "@/modules/facturation/facturation.types";
import type { StatutCulling, StatutGalerie } from "@/modules/photos-galeries/galerie.types";
import {
  CHART_COLORS,
  DonutChart,
  TrendChart,
  type DonutSlice,
  type TrendPoint,
} from "@/modules/seances/components/stats-charts";
import type { SeanceDTO } from "@/modules/seances/seance.dto";
import type { TacheDTO } from "@/modules/seances/tache.dto";

const MONTHS = 6;

/** The last 6 calendar months (oldest first), with a short label. */
function lastMonths(now: Date): { key: string; label: string }[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: fmt.format(d) };
  });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function perMonth(now: Date, items: { date: string; value: number }[]): TrendPoint[] {
  const months = lastMonths(now);
  const sums = new Map(months.map((m) => [m.key, 0]));
  for (const it of items) {
    const k = monthKey(it.date);
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + it.value);
  }
  return months.map((m) => ({
    label: m.label,
    value: Math.round((sums.get(m.key) ?? 0) * 1000) / 1000,
  }));
}

/** 8103.9 → "8.1k", 640 → "640" (the card's hint gives the exact total). */
function shortMoney(v: number): string {
  return v >= 1000
    ? `${(Math.round(v / 100) / 10).toLocaleString("en-GB")}k`
    : String(Math.round(v));
}

function ChartCard({
  title,
  hint,
  href,
  children,
}: {
  title: string;
  hint?: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle>{title}</CardTitle>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-sm font-medium text-primary-text hover:underline"
          >
            Details
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardCharts({
  isAdmin,
  canSeances,
  seances,
  taches,
  factures,
  galeriesParStatut,
  photosParCulling,
  now = new Date(),
}: {
  isAdmin: boolean;
  /** Planning and tasks pages (the retoucher has none): no link to them otherwise. */
  canSeances: boolean;
  /** Already scoped: every session for the admin, the user's own otherwise. */
  seances: SeanceDTO[];
  taches: TacheDTO[];
  /** Empty when the user has no access to billing. */
  factures: FactureAvecContexte[];
  galeriesParStatut: Record<StatutGalerie, number>;
  photosParCulling: Record<StatutCulling, number>;
  now?: Date;
}) {
  const nowIso = now.toISOString();
  const held = seances.filter((s) => s.statut !== "ANNULEE");

  // Sessions per month (cancelled ones left out), last 6 months.
  const sessionsTrend = perMonth(
    now,
    held.map((s) => ({ date: s.dateDebut, value: 1 })),
  );
  const sessions6m = sessionsTrend.reduce((a, p) => a + p.value, 0);

  // Money actually received per month (each payment on its own date).
  const payments = factures.flatMap((f) =>
    f.paiements?.length
      ? f.paiements.map((p) => ({ date: p.date, value: p.montant }))
      : f.montantPaye > 0 && f.datePaiement
        ? [{ date: f.datePaiement, value: f.montantPaye }]
        : [],
  );
  const revenueTrend = perMonth(now, payments);
  const revenue6m = revenueTrend.reduce((a, p) => a + p.value, 0);

  // Event types, over the same 6 months + what is already booked ahead.
  const since = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1).toISOString();
  const byType = new Map<string, number>();
  for (const s of held) {
    if (s.dateDebut < since) continue;
    byType.set(s.typeEvenement.nom, (byType.get(s.typeEvenement.nom) ?? 0) + 1);
  }
  const sortedTypes = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  // The 4 biggest, then "Other": each slice keeps its own colour.
  const typeSlices: DonutSlice[] = sortedTypes
    .slice(0, 4)
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i] }));
  const otherTypes = sortedTypes.slice(4).reduce((a, [, v]) => a + v, 0);
  if (otherTypes > 0) {
    typeSlices.push({ label: "Other", value: otherTypes, color: "var(--muted-foreground)" });
  }
  const typeTotal = typeSlices.reduce((a, s) => a + s.value, 0);

  // Upcoming sessions: what still needs the studio's attention.
  const upcoming = seances.filter(
    (s) => s.dateDebut >= nowIso && s.statut !== "ANNULEE" && s.statut !== "TERMINEE",
  );
  const pipeline: DonutSlice[] = [
    {
      label: "To confirm",
      value: upcoming.filter(
        (s) => s.statut === "DEMANDE_RECUE" || s.statut === "EN_ATTENTE_CONFIRMATION",
      ).length,
      color: "var(--warning)",
    },
    {
      label: "Confirmed",
      value: upcoming.filter((s) => s.statut === "CONFIRMEE").length,
      color: "var(--success)",
    },
    {
      label: "In progress",
      value: upcoming.filter((s) => s.statut === "EN_COURS").length,
      color: "var(--ai)",
    },
    {
      label: "Postponed",
      value: upcoming.filter((s) => s.statut === "REPORTEE").length,
      color: "var(--chart-4)",
    },
  ];

  // Invoices by amount: collected, still due, overdue.
  const paid = factures.reduce((a, f) => a + f.montantPaye, 0);
  const overdue = factures
    .filter((f) => f.statut === "EN_RETARD")
    .reduce((a, f) => a + Math.max(0, f.montantTTC - f.montantPaye), 0);
  const due = factures
    .filter((f) => f.statut !== "EN_RETARD")
    .reduce((a, f) => a + Math.max(0, f.montantTTC - f.montantPaye), 0);
  const billed = paid + due + overdue;
  const invoiceSlices: DonutSlice[] = [
    { label: "Collected", value: paid, color: "var(--success)", display: shortMoney(paid) },
    { label: "Still due", value: due, color: "var(--warning)", display: shortMoney(due) },
    {
      label: "Overdue",
      value: overdue,
      color: "var(--destructive)",
      display: shortMoney(overdue),
    },
  ];

  // Galleries along their cycle, and the photos' culling.
  const gallerySlices: DonutSlice[] = [
    { label: "Culling", value: galeriesParStatut.EN_TRI, color: "var(--warning)" },
    { label: "Shared", value: galeriesParStatut.PARTAGEE, color: "var(--chart-1)" },
    { label: "Approved", value: galeriesParStatut.VALIDEE, color: "var(--success)" },
    { label: "Delivered", value: galeriesParStatut.LIVREE, color: "var(--ai)" },
  ];
  const galleryTotal = gallerySlices.reduce((a, s) => a + s.value, 0);
  const cullingSlices: DonutSlice[] = [
    { label: "Kept", value: photosParCulling.RETENUE, color: "var(--success)" },
    { label: "Rejected", value: photosParCulling.REJETEE, color: "var(--destructive)" },
    { label: "Waiting", value: photosParCulling.EN_ATTENTE, color: "var(--warning)" },
  ];
  const photoTotal = cullingSlices.reduce((a, s) => a + s.value, 0);

  // Tasks (own tasks for staff).
  const taskSlices: DonutSlice[] = [
    {
      label: "To do",
      value: taches.filter((t) => t.statut === "A_FAIRE").length,
      color: "var(--chart-4)",
    },
    {
      label: "In progress",
      value: taches.filter((t) => t.statut === "EN_COURS").length,
      color: "var(--chart-1)",
    },
    {
      label: "Done",
      value: taches.filter((t) => t.statut === "TERMINEE").length,
      color: "var(--success)",
    },
  ];
  const lateTasks = taches.filter((t) => t.enRetard).length;
  const openTasks = taches.filter((t) => t.statut !== "TERMINEE").length;

  const mine = isAdmin ? "" : "Your ";

  return (
    <section aria-labelledby="dashboard-charts" className="space-y-4">
      <h2
        id="dashboard-charts"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {isAdmin ? "Studio at a glance" : "Your activity at a glance"}
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={`${mine}Sessions per month`}
          hint={`${sessions6m} over the last ${MONTHS} months (cancelled ones excluded)`}
          href={
            isAdmin ? "/dashboard/statistiques" : canSeances ? "/dashboard/planning" : undefined
          }
        >
          <TrendChart
            id="dash-sessions"
            points={sessionsTrend}
            label="Sessions per month, last 6 months"
          />
        </ChartCard>

        {isAdmin ? (
          <ChartCard
            title="Payments received"
            hint={`${formatCurrency(revenue6m)} collected over the last ${MONTHS} months`}
            href="/dashboard/facturation"
          >
            <TrendChart
              id="dash-revenue"
              points={revenueTrend}
              color={CHART_COLORS[1]}
              format={shortMoney}
              formatFull={formatCurrency}
              label="Payments received per month, last 6 months"
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="Your tasks"
            hint={lateTasks > 0 ? `${lateTasks} overdue` : "Nothing overdue"}
            href={canSeances ? "/dashboard/taches" : undefined}
          >
            {taches.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No tasks assigned to you.
              </p>
            ) : (
              <DonutChart
                compact
                slices={taskSlices}
                centerValue={openTasks}
                centerLabel="open"
                label="Your tasks by status"
              />
            )}
          </ChartCard>
        )}
      </div>

      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", isAdmin && "xl:grid-cols-3")}>
        <ChartCard title="Upcoming sessions" hint="By status: what still needs attention">
          <DonutChart
            compact
            slices={pipeline}
            centerValue={upcoming.length}
            centerLabel="upcoming"
            label="Upcoming sessions by status"
          />
        </ChartCard>

        <ChartCard title={`${mine}Event types`} hint={`Last ${MONTHS} months and booked ahead`}>
          <DonutChart
            compact
            slices={typeSlices}
            centerValue={typeTotal}
            centerLabel="sessions"
            label="Sessions by event type"
          />
        </ChartCard>

        {isAdmin ? (
          <ChartCard
            title="Invoices"
            hint={`${formatCurrency(billed)} billed in total`}
            href="/dashboard/facturation"
          >
            <DonutChart
              compact
              slices={invoiceSlices}
              centerValue={billed > 0 ? `${Math.round((paid / billed) * 100)}%` : "—"}
              centerLabel="collected"
              label="Invoice amounts: collected, still due, overdue"
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="Photo culling"
            hint="Kept, rejected and still to sort"
            href="/dashboard/photos"
          >
            <DonutChart
              compact
              slices={cullingSlices}
              centerValue={photoTotal}
              centerLabel="photos"
              label="Photos by culling status"
            />
          </ChartCard>
        )}

        <ChartCard
          title="Galleries"
          hint="Where each gallery is in its cycle"
          href="/dashboard/galeries"
        >
          <DonutChart
            compact
            slices={gallerySlices}
            centerValue={galleryTotal}
            centerLabel="galleries"
            label="Galleries by stage"
          />
        </ChartCard>

        {isAdmin && (
          <ChartCard
            title="Photo culling"
            hint="Kept, rejected and still to sort"
            href="/dashboard/photos"
          >
            <DonutChart
              compact
              slices={cullingSlices}
              centerValue={photoTotal}
              centerLabel="photos"
              label="Photos by culling status"
            />
          </ChartCard>
        )}

        {isAdmin && (
          <ChartCard
            title="Tasks"
            hint={lateTasks > 0 ? `${lateTasks} overdue` : "Nothing overdue"}
            href={canSeances ? "/dashboard/taches" : undefined}
          >
            <DonutChart
              compact
              slices={taskSlices}
              centerValue={openTasks}
              centerLabel="open"
              label="Tasks by status"
            />
          </ChartCard>
        )}
      </div>
    </section>
  );
}
