/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ClientBilling } from "@/modules/facturation/components/client-billing";
import { listDevis, listFactures } from "@/modules/facturation/devis.service";

export const metadata: Metadata = { title: "Quotes & invoices" };

export default async function MesFacturesPage() {
  const user = await requireArea("espace-client");
  const [devis, factures] = await Promise.all([listDevis(user), listFactures(user)]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes & invoices"
        description="Accept your quotes online and follow your payments."
      />
      <ClientBilling devis={devis} factures={factures} />
    </div>
  );
}
