"use client";

import { Banknote, Download, ReceiptText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  factureTypeLabel,
  pdfHref,
  statutFactureConfig,
  type StatutFacture,
} from "../facturation.types";
import type { FactureAvecContexte } from "../facturation.types";
import { PaiementDialog } from "./paiement-dialog";

/** AI late-payment risk (cahier: "flag invoices likely to be paid late"). */
function RiskBadge({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const level = value >= 0.6 ? "High risk" : value >= 0.3 ? "Medium risk" : "Low risk";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold ring-1 ring-inset",
            value >= 0.6 ? "bg-ai text-white ring-ai" : "bg-ai-soft text-ai-text ring-ai/25",
          )}
        >
          <Sparkles className="size-3" aria-hidden />
          {percent}%
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {level} of late payment (AI), based on the client&apos;s history.
      </TooltipContent>
    </Tooltip>
  );
}

/** /dashboard/facturation/factures — invoices, payments and AI late-payment risk. */
export function FacturesBoard({ factures }: { factures: FactureAvecContexte[] }) {
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<StatutFacture | typeof ALL>(ALL);
  const [paying, setPaying] = useState<FactureAvecContexte | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return factures
      .filter((f) => statut === ALL || f.statut === statut)
      .filter((f) => !q || `${f.numero} ${fullName(f.devis.client)}`.toLowerCase().includes(q));
  }, [factures, query, statut]);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search invoices"
          placeholder="Invoice number or client…"
          className="flex-1"
        />
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutFactureConfig)}
          allLabel="All statuses"
          label="Filter by status"
          className="w-48"
        />
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No invoices"
          description="No invoice matches these criteria."
          className="m-4"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Invoice</th>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Due date</th>
                <th className="px-4 py-2.5">Payment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">AI risk</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const reste = f.montantTTC - f.montantPaye;
                return (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{f.numero}</span>
                        <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-border">
                          {factureTypeLabel(f)}
                        </span>
                      </span>
                      <Link
                        href={`/dashboard/facturation/devis/${f.devis.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Quote {f.devis.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate">
                        {fullName(f.devis.client)}
                      </span>
                      <span className="block max-w-48 truncate text-xs text-muted-foreground">
                        {f.devis.seance.titre}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 whitespace-nowrap",
                        f.statut === "EN_RETARD"
                          ? "font-semibold text-destructive-text"
                          : "text-slate",
                      )}
                    >
                      {formatDate(f.dateEcheance)}
                    </td>
                    <td className="w-52 px-4 py-3">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(f.montantPaye)}
                        </span>
                        <span className="text-muted-foreground">
                          / {formatCurrency(f.montantTTC)}
                        </span>
                      </div>
                      <Progress
                        value={(f.montantPaye / f.montantTTC) * 100}
                        className="mt-1.5"
                        aria-label={`Paid ${Math.round((f.montantPaye / f.montantTTC) * 100)}%`}
                      />
                      {reste > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Remaining {formatCurrency(reste)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={f.statut} config={statutFactureConfig} />
                    </td>
                    <td className="px-4 py-3">
                      {f.statut !== "PAYEE" && f.risqueRetardIA !== undefined ? (
                        <RiskBadge value={f.risqueRetardIA} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reste <= 0}
                          onClick={() => setPaying(f)}
                        >
                          <Banknote aria-hidden />
                          Payment received
                        </Button>
                        <Button size="icon-sm" variant="ghost" asChild>
                          <a href={pdfHref(f.devis.id, f.id)} download aria-label={`Download ${f.numero} (PDF)`}>
                            <Download aria-hidden />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaiementDialog
        devisId={paying?.devis.id ?? ""}
        facture={paying}
        onOpenChange={(open) => !open && setPaying(null)}
      />
    </Card>
  );
}
