/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import { Globe, MessageSquareReply, Smile, Star } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import { AvisBoard } from "@/modules/avis-reclamations/components/avis-board";
import { getAvisInsights } from "@/modules/avis-reclamations/analytics.service";
import { listAvis } from "@/modules/avis-reclamations/avis.service";

export const metadata: Metadata = { title: "Client reviews" };

export default async function AvisPage() {
  await requireArea("avis-reclamations");
  const [{ items: avis }, insights] = await Promise.all([listAvis(), getAvisInsights()]);
  const moyenne = avis.length ? avis.reduce((s, a) => s + a.note, 0) / avis.length : 0;
  const positifs = avis.filter((a) => a.sentimentIA === "POSITIF").length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client reviews"
        description="Reply to reviews and choose which ones appear on the website. The AI tags sentiment and topics and drafts replies; you always review before publishing."
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
          value={`${avis.length ? Math.round((positifs / avis.length) * 100) : 0}%`}
          icon={Smile}
          tone="ai"
        />
        <StatCard
          label="Published on the website"
          value={avis.filter((a) => a.estPublie).length}
          icon={Globe}
          tone="green"
        />
        <StatCard
          label="Unanswered"
          value={avis.filter((a) => !a.reponseStudio).length}
          icon={MessageSquareReply}
          tone="red"
        />
      </div>
      <AvisBoard avis={avis} insights={insights} />
    </div>
  );
}
