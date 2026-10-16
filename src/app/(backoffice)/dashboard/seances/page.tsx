/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { MOCK_PHOTOGRAPHES } from "@/lib/mock-data-helpers";
import { SeancesBoard } from "@/modules/seances/components/seances-board";
import { SEANCES } from "@/modules/seances/mock-data";

export const metadata: Metadata = { title: "Sessions" };

export default async function SeancesPage() {
  const user = await requireArea("seances");
  // A photographer only sees their own sessions (permission matrix).
  const seances =
    user.role === "PHOTOGRAPHE" ? SEANCES.filter((s) => s.photographe.id === "u-photo-1") : SEANCES;
  const count = (statut: string) => seances.filter((s) => s.statut === statut).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Schedule, confirm and follow the studio's photo sessions."
        actions={
          <Button asChild>
            <Link href="/dashboard/seances/nouvelle">
              <CalendarPlus aria-hidden />
              New session
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total" value={seances.length} icon={CalendarDays} />
        <StatCard label="Planned" value={count("PLANIFIEE")} icon={CalendarClock} tone="amber" />
        <StatCard label="Confirmed" value={count("CONFIRMEE")} icon={CalendarCheck} tone="green" />
        <StatCard label="Cancelled" value={count("ANNULEE")} icon={CalendarX2} tone="red" />
      </div>
      <SeancesBoard seances={seances} photographes={MOCK_PHOTOGRAPHES} />
    </div>
  );
}
