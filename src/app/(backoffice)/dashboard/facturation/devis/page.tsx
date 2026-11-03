/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { FileCheck2, FilePen, FilePlus2, FileText, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { formatTND } from "@/modules/facturation/facturation.utils";
import { DevisList } from "@/modules/facturation/components/devis-list";
import { getDevisStats, listDevis } from "@/modules/facturation/devis.service";

export const metadata: Metadata = { title: "Quotes" };

export default async function DevisPage() {
  const user = await requireArea("facturation");
  const [devis, stats] = await Promise.all([listDevis(user), getDevisStats(user)]);
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
          value={stats.brouillons}
          icon={FilePen}
          tone="neutral"
        />
        <StatCard
          label="Sent"
          value={stats.envoyes}
          icon={Send}
        />
        <StatCard label="Accepted" value={stats.acceptes} icon={FileCheck2} tone="green" />
        <StatCard
          label="Accepted amount"
          value={formatTND(stats.montantAccepte)}
          icon={FileText}
          tone="amber"
        />
      </div>
      <DevisList devis={devis} />
    </div>
  );
}
