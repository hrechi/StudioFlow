/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { KitSuggestion } from "@/modules/materiel/components/kit-suggestion";
import { ReservationFormDialog } from "@/modules/materiel/components/reservation-form";
import { ReservationsBoard } from "@/modules/materiel/components/reservations-board";
import { listMateriels } from "@/modules/materiel/materiel.service";
import { listReservations } from "@/modules/materiel/reservation-materiel.service";
import { listSeancesReservables } from "@/modules/materiel/seance-source";

export const metadata: Metadata = { title: "Equipment reservations" };

export default async function ReservationsPage() {
  const user = await requireArea("materiel");
  const [reservations, seances, materiels] = await Promise.all([
    listReservations(),
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ReservationsBoard
          reservations={reservations}
          currentUser={{ id: user.id, role: user.role }}
        />
        <div className="self-start">
          <KitSuggestion seances={seances} />
        </div>
      </div>
    </div>
  );
}
