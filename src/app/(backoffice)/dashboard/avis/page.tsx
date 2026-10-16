/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import { Globe, MessageSquareReply, Smile, Star } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import { AvisBoard } from "@/modules/avis-reclamations/components/avis-board";
import { AVIS } from "@/modules/avis-reclamations/mock-data";

export const metadata: Metadata = { title: "Client reviews" };

export default async function AvisPage() {
  await requireArea("avis-reclamations");
  const moyenne = AVIS.reduce((s, a) => s + a.note, 0) / AVIS.length;
  const positifs = AVIS.filter((a) => a.sentimentIA === "POSITIF").length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client reviews"
        description="Reply to reviews and choose which ones appear on the website. Sentiment is analyzed by the AI."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Average rating"
          value={`${moyenne.toFixed(1)} / 5`}
          icon={Star}
          tone="amber"
        />
        <StatCard
          label="Positive sentiment (AI)"
          value={`${Math.round((positifs / AVIS.length) * 100)}%`}
          icon={Smile}
          tone="ai"
        />
        <StatCard
          label="Published on the website"
          value={AVIS.filter((a) => a.estPublie).length}
          icon={Globe}
          tone="green"
        />
        <StatCard
          label="Unanswered"
          value={AVIS.filter((a) => !a.reponseStudio).length}
          icon={MessageSquareReply}
          tone="red"
        />
      </div>
      <AvisBoard avis={AVIS} />
    </div>
  );
}
