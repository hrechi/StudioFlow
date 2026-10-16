/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { KitSuggestion } from "@/modules/materiel/components/kit-suggestion";
import { ReservationsBoard } from "@/modules/materiel/components/reservations-board";
import { KIT_SUGGERE, RESERVATIONS } from "@/modules/materiel/mock-data";

export const metadata: Metadata = { title: "Equipment reservations" };

export default async function ReservationsPage() {
  await requireArea("materiel");
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
          <ComingSoonButton feature="New reservation">
            <CalendarPlus aria-hidden />
            New reservation
          </ComingSoonButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ReservationsBoard reservations={RESERVATIONS} />
        <div className="self-start">
          <KitSuggestion kit={KIT_SUGGERE} />
        </div>
      </div>
    </div>
  );
}
