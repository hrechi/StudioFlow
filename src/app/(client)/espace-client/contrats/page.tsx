/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ContratsList } from "@/modules/contrats/components/contrats-list";
import { listContrats } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "My Contracts" };

export default async function ClientContratsPage() {
  const actor = await requireArea("espace-client");
  const contrats = await listContrats(actor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My contracts"
        description="Contracts sent by the studio for your signature."
      />
      <ContratsList contrats={contrats} basePath="/espace-client/contrats" />
    </div>
  );
}
