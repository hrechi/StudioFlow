/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { AlarmClock, CircleCheck, HandCoins, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import { formatCurrency } from "@/lib/utils";
import { FacturesBoard } from "@/modules/facturation/components/factures-board";
import { FACTURES } from "@/modules/facturation/mock-data";

export const metadata: Metadata = { title: "Invoices" };

export default async function FacturesPage() {
  await requireArea("facturation");
  const unpaid = FACTURES.filter((f) => f.statut !== "PAYEE");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Deposit and balance invoices, partial payments and follow-up of unpaid invoices."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="To collect"
          value={formatCurrency(unpaid.reduce((s, f) => s + f.montantTTC - f.montantPaye, 0))}
          icon={Wallet}
        />
        <StatCard label="Unpaid invoices" value={unpaid.length} icon={HandCoins} tone="amber" />
        <StatCard
          label="Overdue"
          value={FACTURES.filter((f) => f.statut === "EN_RETARD").length}
          icon={AlarmClock}
          tone="red"
        />
        <StatCard
          label="Paid"
          value={FACTURES.filter((f) => f.statut === "PAYEE").length}
          icon={CircleCheck}
          tone="green"
        />
      </div>
      <FacturesBoard factures={FACTURES} />
    </div>
  );
}
