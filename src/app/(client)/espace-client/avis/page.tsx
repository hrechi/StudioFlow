/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ClientFeedback } from "@/modules/avis-reclamations/components/client-feedback";
import { MES_AVIS, MES_RECLAMATIONS, SEANCES_A_NOTER } from "@/modules/avis-reclamations/mock-data";

export const metadata: Metadata = { title: "Reviews & complaints" };

export default async function MesAvisPage() {
  await requireArea("espace-client");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & complaints"
        description="Rate your sessions, report a problem and follow the studio's reply."
      />
      <ClientFeedback
        seancesANoter={SEANCES_A_NOTER}
        mesAvis={MES_AVIS}
        mesReclamations={MES_RECLAMATIONS}
      />
    </div>
  );
}
