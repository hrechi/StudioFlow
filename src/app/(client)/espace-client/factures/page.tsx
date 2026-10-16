/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ClientBilling } from "@/modules/facturation/components/client-billing";
import { MES_DEVIS, MES_FACTURES } from "@/modules/facturation/mock-data";

export const metadata: Metadata = { title: "Quotes & invoices" };

export default async function MesFacturesPage() {
  await requireArea("espace-client");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes & invoices"
        description="Accept your quotes online and follow your payments."
      />
      <ClientBilling devis={MES_DEVIS} factures={MES_FACTURES} />
    </div>
  );
}
