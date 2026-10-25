/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { CalendarClock, Camera, CircleCheck, PackagePlus, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { MaterielFormDialog } from "@/modules/materiel/components/materiel-form";
import { MaterielInventory } from "@/modules/materiel/components/materiel-inventory";
import { getMaterielStats, listMateriels } from "@/modules/materiel/materiel.service";

export const metadata: Metadata = { title: "Equipment" };

export default async function MaterielPage() {
  const user = await requireArea("materiel");
  const isAdmin = user.role === "ADMIN";
  const [materiels, stats] = await Promise.all([listMateriels(), getMaterielStats()]);

  const addButton = isAdmin && (
    <MaterielFormDialog
      trigger={
        <Button>
          <PackagePlus aria-hidden />
          Add
        </Button>
      }
    />
  );

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
            {addButton}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Items" value={stats.total} icon={Camera} />
        <StatCard label="Available" value={stats.disponibles} icon={CircleCheck} tone="green" />
        <StatCard label="Out of order" value={stats.enPanne} icon={Wrench} tone="red" />
      </div>
      {materiels.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="The inventory is empty"
          description={
            isAdmin
              ? "Add the studio's first piece of equipment."
              : "An administrator has not registered any equipment yet."
          }
          action={addButton || undefined}
        />
      ) : (
        <MaterielInventory materiels={materiels} isAdmin={isAdmin} />
      )}
    </div>
  );
}
