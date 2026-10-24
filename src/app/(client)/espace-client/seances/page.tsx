/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { CalendarPlus, CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { ClientSeanceCard } from "@/modules/seances/components/client-seance-card";
import { listSeancesForClient } from "@/modules/seances/seance.service";

export const metadata: Metadata = { title: "My sessions" };

export default async function MesSeancesPage() {
  const user = await requireArea("espace-client");
  const seances = await listSeancesForClient(user.id);
  const now = new Date().toISOString();
  const closed = (s: (typeof seances)[number]) =>
    s.statut === "ANNULEE" || s.statut === "TERMINEE";
  const aVenir = seances.filter((s) => !closed(s) && s.dateFin >= now).reverse();
  const passees = seances.filter((s) => closed(s) || s.dateFin < now);

  return (
    <div className="space-y-8">
      <PageHeader
        title="My sessions"
        description="Your requests, upcoming sessions and your history with the studio."
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
            {aVenir.map((s) => <ClientSeanceCard key={s.id} seance={s} />)}
          </div>
        )}
      </section>
      {passees.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {passees.map((s) => <ClientSeanceCard key={s.id} seance={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
