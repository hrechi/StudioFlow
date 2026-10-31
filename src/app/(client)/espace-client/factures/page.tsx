/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ClientBilling } from "@/modules/facturation/components/client-billing";
import { listDevis, listFactures } from "@/modules/facturation/devis.service";
import { passerellesDisponibles } from "@/modules/facturation/konnect";
import { tauxTndEur } from "@/modules/facturation/stripe";

export const metadata: Metadata = { title: "Quotes & invoices" };

const RETOURS = { success: "success", pending: "pending", failed: "failed" } as const;

export default async function MesFacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const user = await requireArea("espace-client");
  const [{ paiement }, devis, factures] = await Promise.all([searchParams, listDevis(user), listFactures(user)]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes & invoices"
        description="Accept your quotes, pay your invoices and download them."
      />
      <ClientBilling
        devis={devis}
        factures={factures}
        passerelles={passerellesDisponibles()}
        tauxEur={tauxTndEur()}
        retourPaiement={paiement ? RETOURS[paiement as keyof typeof RETOURS] : undefined}
      />
    </div>
  );
}
