/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { CalendarClock, Camera, CircleCheck, PackagePlus, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { MaterielInventory } from "@/modules/materiel/components/materiel-inventory";
import { MATERIELS } from "@/modules/materiel/mock-data";

export const metadata: Metadata = { title: "Equipment" };

export default async function MaterielPage() {
  await requireArea("materiel");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment inventory"
        description="The studio's cameras, lenses, lighting and accessories, with their condition and availability."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/materiel/reservations">
                <CalendarClock aria-hidden />
                Reservations
              </Link>
            </Button>
            <ComingSoonButton feature="Add equipment">
              <PackagePlus aria-hidden />
              Add
            </ComingSoonButton>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Items" value={MATERIELS.length} icon={Camera} />
        <StatCard
          label="Available"
          value={MATERIELS.filter((m) => m.disponible).length}
          icon={CircleCheck}
          tone="green"
        />
        <StatCard
          label="Reserved"
          value={MATERIELS.filter((m) => !m.disponible && m.etat !== "EN_PANNE").length}
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard
          label="Out of order"
          value={MATERIELS.filter((m) => m.etat === "EN_PANNE").length}
          icon={Wrench}
          tone="red"
        />
      </div>
      <MaterielInventory materiels={MATERIELS} />
    </div>
  );
}
