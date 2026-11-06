/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ContratsList } from "@/modules/contrats/components/contrats-list";
import { listContrats } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContratsPage() {
  const actor = await requireArea("contrats");
  const contrats = await listContrats(actor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Create, send and track blockchain-certified contracts."
      />
      <ContratsList
        contrats={contrats}
        basePath="/dashboard/contrats"
        showCreateButton
      />
    </div>
  );
}
