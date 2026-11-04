/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { KitSuggestionDrawer } from "@/modules/materiel/components/kit-suggestion-drawer";
import { ReservationFormDialog } from "@/modules/materiel/components/reservation-form";
import { ReservationsBoard } from "@/modules/materiel/components/reservations-board";
import { listMateriels } from "@/modules/materiel/materiel.service";
import {
  getReservationStats,
  listReservations,
} from "@/modules/materiel/reservation-materiel.service";
import { listSeancesReservables } from "@/modules/materiel/seance-source";

export const metadata: Metadata = { title: "Equipment reservations" };

export default async function ReservationsPage() {
  const user = await requireArea("materiel");
  const [reservations, stats, seances, materiels] = await Promise.all([
    listReservations(),
    getReservationStats(),
    listSeancesReservables(),
    listMateriels(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/materiel"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Inventory
          </Link>
        }
        title="Equipment reservations"
        description="Reserve equipment per session: overlapping reservations are blocked."
        actions={
          <ReservationFormDialog
            seances={seances}
            materiels={materiels}
            trigger={
              <Button>
                <CalendarPlus aria-hidden />
                New reservation
              </Button>
            }
          />
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active now" value={stats.activeNow} icon={Activity} tone="green" />
        <StatCard
          label="Upcoming (7 days)"
          value={stats.upcoming}
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard label="Pending confirmation" value={stats.pending} icon={Clock} tone="amber" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="red" />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ReservationsBoard
          reservations={reservations}
          currentUser={{ id: user.id, role: user.role }}
        />
        <KitSuggestionDrawer seances={seances} />
      </div>
    </div>
  );
}
