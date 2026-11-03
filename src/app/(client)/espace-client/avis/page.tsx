/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ClientFeedback } from "@/modules/avis-reclamations/components/client-feedback";
import { listAvis } from "@/modules/avis-reclamations/avis.service";
import { listReclamations } from "@/modules/avis-reclamations/reclamation.service";
import { SEANCES_A_NOTER } from "@/modules/avis-reclamations/mock-data";

export const metadata: Metadata = { title: "Reviews & complaints" };

export default async function MesAvisPage() {
  const user = await requireArea("espace-client");
  const [{ items: mesAvis }, { items: mesReclamations }] = await Promise.all([
    listAvis({ auteurId: user.id }),
    listReclamations({ auteurId: user.id }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & complaints"
        description="Rate your sessions, report a problem and follow the studio's reply."
      />
      <ClientFeedback
        seancesANoter={SEANCES_A_NOTER}
        mesAvis={mesAvis}
        mesReclamations={mesReclamations}
      />
    </div>
  );
}
