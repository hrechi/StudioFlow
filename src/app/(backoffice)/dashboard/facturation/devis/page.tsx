/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { FileCheck2, FilePen, FilePlus2, FileText, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { formatCurrency } from "@/lib/utils";
import { DevisList } from "@/modules/facturation/components/devis-list";
import { DEVIS } from "@/modules/facturation/mock-data";

export const metadata: Metadata = { title: "Quotes" };

export default async function DevisPage() {
  await requireArea("facturation");
  const accepted = DEVIS.filter((d) => d.statut === "ACCEPTE");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Create quotes (by hand or with the AI), send them to the client portal and follow their acceptance."
        actions={
          <Button asChild>
            <Link href="/dashboard/facturation/devis/nouveau">
              <FilePlus2 aria-hidden />
              New quote
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Drafts"
          value={DEVIS.filter((d) => d.statut === "BROUILLON").length}
          icon={FilePen}
          tone="neutral"
        />
        <StatCard
          label="Sent"
          value={DEVIS.filter((d) => d.statut === "ENVOYE").length}
          icon={Send}
        />
        <StatCard label="Accepted" value={accepted.length} icon={FileCheck2} tone="green" />
        <StatCard
          label="Accepted amount"
          value={formatCurrency(accepted.reduce((s, d) => s + d.montantTTC, 0))}
          icon={FileText}
          tone="amber"
        />
      </div>
      <DevisList devis={DEVIS} />
    </div>
  );
}
