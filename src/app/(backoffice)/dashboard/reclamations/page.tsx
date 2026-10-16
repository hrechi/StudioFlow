/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import { CircleCheck, Inbox, LoaderCircle, Siren } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import { ReclamationsBoard } from "@/modules/avis-reclamations/components/reclamations-board";
import { RECLAMATIONS } from "@/modules/avis-reclamations/mock-data";

export const metadata: Metadata = { title: "Complaints" };

export default async function ReclamationsPage() {
  await requireArea("avis-reclamations");
  const count = (statut: string) => RECLAMATIONS.filter((r) => r.statut === statut).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        description="The AI categorizes and prioritizes each complaint; the staff take charge, reply, then resolve or reject it."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Open" value={count("OUVERTE")} icon={Inbox} tone="amber" />
        <StatCard label="In progress" value={count("EN_COURS")} icon={LoaderCircle} />
        <StatCard
          label="Urgent"
          value={
            RECLAMATIONS.filter((r) => r.priorite === "URGENTE" && r.statut !== "RESOLUE").length
          }
          icon={Siren}
          tone="red"
        />
        <StatCard label="Resolved" value={count("RESOLUE")} icon={CircleCheck} tone="green" />
      </div>
      <ReclamationsBoard reclamations={RECLAMATIONS} />
    </div>
  );
}
