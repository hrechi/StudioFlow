/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { CalendarPlus, CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { SeanceCard } from "@/modules/seances/components/seance-card";
import { MES_SEANCES } from "@/modules/seances/mock-data";

export const metadata: Metadata = { title: "My sessions" };

export default async function MesSeancesPage() {
  await requireArea("espace-client");
  const now = new Date().toISOString();
  const aVenir = MES_SEANCES.filter((s) => s.dateDebut >= now && s.statut !== "ANNULEE");
  const passees = MES_SEANCES.filter((s) => s.dateDebut < now || s.statut === "ANNULEE");

  return (
    <div className="space-y-8">
      <PageHeader
        title="My sessions"
        description="Your upcoming sessions and your history with the studio."
        actions={
          <Button asChild>
            <Link href="/espace-client/seances/reserver">
              <CalendarPlus aria-hidden />
              Book a session
            </Link>
          </Button>
        }
      />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
        {aVenir.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No upcoming sessions"
            description="Book your next session in a few clicks."
            action={
              <Button asChild>
                <Link href="/espace-client/seances/reserver">Book a session</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {aVenir.map((seance) => (
              <SeanceCard key={seance.id} seance={seance} />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">History</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {passees.map((seance) => (
            <SeanceCard key={seance.id} seance={seance} className="opacity-90" />
          ))}
        </div>
      </section>
    </div>
  );
}
