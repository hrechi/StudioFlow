/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import { CircleCheck, Inbox, LoaderCircle, MessagesSquare, Siren, ThumbsUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { ReclamationsBoard } from "@/modules/avis-reclamations/components/reclamations-board";
import { getReclamationStats } from "@/modules/avis-reclamations/analytics.service";
import { listReclamations } from "@/modules/avis-reclamations/reclamation.service";

export const metadata: Metadata = { title: "Complaints" };

export default async function ReclamationsPage() {
  await requireArea("avis-reclamations");
  const [{ items: reclamations }, stats] = await Promise.all([
    listReclamations(),
    getReclamationStats(),
  ]);
  const count = (statut: string) => reclamations.filter((r) => r.statut === statut).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        description="The AI categorizes and prioritizes each complaint; the staff take charge, chat with the client, then resolve or reject it; clients rate the resolution."
        actions={
          <Button asChild>
            <Link href="/dashboard/reclamations/inbox">
              <MessagesSquare aria-hidden />
              Open messages
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Open" value={count("OUVERTE")} icon={Inbox} tone="amber" />
        <StatCard label="In progress" value={count("EN_COURS")} icon={LoaderCircle} />
        <StatCard
          label="Urgent"
          value={
            reclamations.filter((r) => r.priorite === "URGENTE" && r.statut !== "RESOLUE").length
          }
          icon={Siren}
          tone="red"
        />
        <StatCard label="Resolved" value={count("RESOLUE")} icon={CircleCheck} tone="green" />
        <StatCard
          label="Resolution satisfaction"
          value={
            stats.satisfactionRate === null ? "—" : `${Math.round(stats.satisfactionRate * 100)}%`
          }
          icon={ThumbsUp}
          tone="ai"
          hint={`${stats.rated} rated · ${stats.reopened} reopened`}
        />
      </div>
      <ReclamationsBoard reclamations={reclamations} />
    </div>
  );
}
