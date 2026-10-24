/* Dashboard — module core (Gestion des Utilisateurs) · Responsable : Louay Herichi + équipe
 * Each block reads another module's MOCK data; replace with that module's service when it exists. */
import {
  ArrowRight,
  BookImage,
  CalendarDays,
  ClipboardList,
  CalendarPlus,
  CloudUpload,
  FilePlus2,
  GalleryHorizontalEnd,
  Images,
  type LucideIcon,
  MessageSquareWarning,
  Package,
  Receipt,
  ScanSearch,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AIPanel } from "@/components/shared/ai-panel";
import { SafeImage } from "@/components/shared/safe-image";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { fullName } from "@/lib/mock-data-helpers";
import { FRONT_IMAGES } from "@/lib/mock-images";
import { can, type Area } from "@/lib/rbac";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { RECLAMATIONS } from "@/modules/avis-reclamations/mock-data";
import { listFactures } from "@/modules/facturation/devis.service";
import { RESERVATIONS } from "@/modules/materiel/mock-data";
import { statutGalerieConfig } from "@/modules/photos-galeries/galerie.types";
import { countGaleriesByStatut, listGaleries } from "@/modules/photos-galeries/galerie.service";
import { countPhotosByCulling } from "@/modules/photos-galeries/photo.service";
import { statutSeanceReelConfig } from "@/modules/seances/seance.dto";
import { listSeances } from "@/modules/seances/seance.service";
import { listTaches } from "@/modules/seances/tache.service";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

export const metadata: Metadata = { title: "Dashboard" };

type QuickAction = { label: string; href: string; icon: LucideIcon; area: Area; ai?: boolean };
const QUICK_ACTIONS: QuickAction[] = [
  { label: "New session", href: "/dashboard/seances/nouveau", icon: CalendarPlus, area: "seances" },
  { label: "Import photos", href: "/dashboard/photos", icon: CloudUpload, area: "photos-galeries" },
  { label: "New quote", href: "/dashboard/facturation/devis/nouveau", icon: FilePlus2, area: "facturation" },
  { label: "AI Search", href: "/dashboard/photos/recherche", icon: ScanSearch, area: "photos-galeries", ai: true },
  { label: "Reserve equipment", href: "/dashboard/materiel/reservations", icon: Package, area: "materiel" },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: BookImage, area: "portfolio" },
];

export default async function DashboardPage() {
  const user = await requireArea("dashboard");
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const nowIso = now.toISOString();

  const scope = user.role === "ADMIN" ? {} : { employeId: user.id };
  const [seances, taches, galeriesParStatut, photosParCulling, galeries] = await Promise.all([
    listSeances(scope),
    listTaches(scope),
    countGaleriesByStatut(),
    countPhotosByCulling(),
    listGaleries(),
    listFactures(user),
  ]);
  const active = seances.filter((s) => s.statut !== "ANNULEE" && s.statut !== "TERMINEE" && s.statut !== "REPORTEE");
  const upcoming = active
    .filter((s) => s.dateDebut >= nowIso)
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
    .slice(0, 4);
  const thisWeek = active.filter((s) => s.dateDebut >= nowIso && s.dateDebut <= weekEnd.toISOString());
  const toConfirm = seances.filter((s) => s.statut === "DEMANDE_RECUE" || s.statut === "EN_ATTENTE_CONFIRMATION").length;
  const lateTasks = taches.filter((t) => t.enRetard);
  const toCull = photosParCulling.EN_ATTENTE;
  const unpaid = FACTURES.filter((f) => f.statut !== "PAYEE");
  const openComplaints = RECLAMATIONS.filter((r) => r.statut === "OUVERTE" || r.statut === "EN_COURS");
  const recentGalleries = galeries.slice(0, 4);

  const stats: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone: "blue" | "green" | "amber" | "red" | "ai";
    hint?: string;
  }[] = [
    { label: "Sessions this week", value: thisWeek.length, icon: CalendarDays, tone: "blue", hint: `${toConfirm} to confirm` },
    { label: "Overdue tasks", value: lateTasks.length, icon: ClipboardList, tone: lateTasks.length > 0 ? "red" : "green" },
    { label: "Photos awaiting culling", value: toCull, icon: Images, tone: "amber" },
    ...(can(user.role, "facturation")
      ? [{ label: "Unpaid invoices", value: unpaid.length, icon: Receipt, tone: "red" as const, hint: formatCurrency(unpaid.reduce((s, f) => s + f.montantTTC - f.montantPaye, 0)) + " to collect" }]
      : [{ label: "Reserved equipment", value: RESERVATIONS.filter((r) => r.statut === "CONFIRMEE" || r.statut === "EN_COURS").length, icon: Package, tone: "green" as const }]),
    ...(can(user.role, "avis-reclamations")
      ? [{ label: "Open complaints", value: openComplaints.length, icon: MessageSquareWarning, tone: "red" as const, hint: `${openComplaints.filter((r) => r.priorite === "URGENTE").length} urgent` }]
      : [{ label: "Shared galleries", value: galeriesParStatut.PARTAGEE, icon: GalleryHorizontalEnd, tone: "blue" as const }]),
  ];

  const insights = [
    `${toCull} photos are waiting to be culled: the AI has already pre-sorted ${photosParCulling.RETENUE + photosParCulling.REJETEE}.`,
    "Saturday afternoon slots are 90% booked: offer Fridays to new clients.",
    can(user.role, "facturation")
      ? `${factures.filter((f) => (f.risqueRetardIA ?? 0) >= 0.6).length} invoice(s) have a high risk of late payment.`
      : "Natural-light portraits get the best quality score this month.",
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
          <SafeImage src={FRONT_IMAGES.studio} alt="" fill sizes="50vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/60 to-transparent" />
        </div>
        <div className="relative max-w-xl space-y-1.5 p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now)}
          </p>
          <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
            Hello, {user.prenom}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at the studio · {roleConfig[user.role].label}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} hint={s.hint} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {can(user.role, "seances") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming sessions</CardTitle>
                <Link href="/dashboard/seances" className="text-sm font-medium text-primary-text hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="divide-y">
                  {upcoming.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={user.role === "ADMIN" ? `/dashboard/seances/${s.id}` : "/dashboard/planning"}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <CalendarDays className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{s.titre}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(s.dateDebut)} · {formatTime(s.dateDebut)} ·{" "}
                            {s.equipe.length ? s.equipe.map((m) => fullName(m.employe)).join(", ") : "No team yet"}
                          </span>
                        </span>
                        <StatusBadge value={s.statut} config={statutSeanceReelConfig} />
                      </Link>
                    </li>
                  ))}
                  {upcoming.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">No upcoming sessions.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent galleries</CardTitle>
              <Link href="/dashboard/galeries" className="text-sm font-medium text-primary-text hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {recentGalleries.map((g) => (
                  <li key={g.id}>
                    <Link href={`/dashboard/galeries/${g.id}`} className="group flex items-center gap-3 rounded-xl p-2 ring-1 ring-border hover:bg-surface/60">
                      <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <SafeImage src={g.photoCouverture} alt="" fill sizes="80px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary-text">{g.titre}</span>
                        <span className="block text-xs text-muted-foreground">{g.nombrePhotos} photos</span>
                        <StatusBadge value={g.statut} config={statutGalerieConfig} className="mt-1 h-5 px-2 text-[0.65rem]" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {can(user.role, "avis-reclamations") && openComplaints.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Complaints to handle</CardTitle>
                <Link href="/dashboard/reclamations" className="text-sm font-medium text-primary-text hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="divide-y">
                  {openComplaints.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <MessageSquareWarning className={cn("size-4 shrink-0", r.priorite === "URGENTE" ? "text-destructive" : "text-warning")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{r.objet}</span>
                        <span className="block text-xs text-muted-foreground">{fullName(r.client)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.filter((a) => can(user.role, a.area)).map((a) => (
                  <li key={a.href}>
                    <Link
                      href={a.href}
                      className={cn(
                        "flex h-full flex-col items-center gap-2 rounded-xl p-3 text-center text-xs font-semibold transition-colors",
                        a.ai ? "bg-ai-soft text-ai-text hover:bg-ai/15" : "bg-surface text-slate hover:bg-accent hover:text-primary-text",
                      )}
                    >
                      <span className={cn("grid size-10 place-items-center rounded-xl bg-card shadow-sm", a.ai ? "text-ai" : "text-primary")}>
                        <a.icon className="size-5" aria-hidden />
                      </span>
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <AIPanel title="AI insights" description="Computed every night from the studio's sessions, photos and payments.">
            <ul className="space-y-3">
              {insights.map((text) => (
                <li key={text} className="flex gap-2 text-sm text-slate">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </AIPanel>
        </div>
      </div>
    </div>
  );
}
