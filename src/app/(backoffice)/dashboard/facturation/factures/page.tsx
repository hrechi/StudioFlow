/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { AlarmClock, CircleCheck, HandCoins, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import { formatTND } from "@/modules/facturation/facturation.utils";
import { FacturesBoard } from "@/modules/facturation/components/factures-board";
import { listFactures } from "@/modules/facturation/devis.service";

export const metadata: Metadata = { title: "Invoices" };

export default async function FacturesPage() {
  const user = await requireArea("facturation");
  const factures = await listFactures(user);
  const unpaid = factures.filter((f) => f.statut !== "PAYEE");
  const aRevoir = factures.reduce((n, f) => n + (f.declarations ?? []).filter((d) => d.statut === "EN_ATTENTE").length, 0);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Deposit and balance invoices, partial payments and follow-up of unpaid invoices."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="To collect"
          value={formatTND(Math.round(unpaid.reduce((s, f) => s + f.montantTTC - f.montantPaye, 0) * 1000))}
          icon={Wallet}
        />
        <StatCard
          label="Unpaid invoices"
          value={unpaid.length}
          icon={HandCoins}
          tone="amber"
          hint={aRevoir > 0 ? `${aRevoir} payment proof${aRevoir > 1 ? "s" : ""} to review` : undefined}
        />
        <StatCard
          label="Overdue"
          value={factures.filter((f) => f.statut === "EN_RETARD").length}
          icon={AlarmClock}
          tone="red"
        />
        <StatCard
          label="Paid"
          value={factures.filter((f) => f.statut === "PAYEE").length}
          icon={CircleCheck}
          tone="green"
        />
      </div>
      <FacturesBoard factures={factures} />
    </div>
  );
}
