"use client";

import { FileSearch, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fullName } from "@/lib/mock-data-helpers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statutDevisConfig, type Devis, type StatutDevis } from "../facturation.types";

/** /dashboard/facturation/devis — quotes list. */
export function DevisList({ devis }: { devis: Devis[] }) {
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<StatutDevis | typeof ALL>(ALL);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devis
      .filter((d) => statut === ALL || d.statut === statut)
      .filter(
        (d) =>
          !q || `${d.numero} ${fullName(d.client)} ${d.seance.titre}`.toLowerCase().includes(q),
      )
      .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission));
  }, [devis, query, statut]);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search quotes"
          placeholder="Quote number, client, session…"
          className="flex-1"
        />
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutDevisConfig)}
          allLabel="All statuses"
          label="Filter by status"
        />
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No quotes"
          description="No quote matches these criteria."
          className="m-4"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <caption className="sr-only">Quotes</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Quote</th>
                <th className="px-4 py-2.5">Client / session</th>
                <th className="px-4 py-2.5">Issued</th>
                <th className="px-4 py-2.5">Valid until</th>
                <th className="px-4 py-2.5 text-right">Amount incl. VAT</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-semibold text-charcoal">
                      {d.numero}
                      {d.genereParIA && <AIBadge />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.prestations.length} service{d.prestations.length > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-slate">{fullName(d.client)}</span>
                    <span className="block max-w-56 truncate text-xs text-muted-foreground">
                      {d.seance.titre}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate">
                    {formatDate(d.dateEmission)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate">
                    {formatDate(d.dateValidite)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-charcoal">
                    {formatCurrency(d.montantTTC)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={d.statut} config={statutDevisConfig} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${d.numero}`}
                        >
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onSelect={() => comingSoon("View the quote (PDF)")}>
                          View PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => comingSoon("Send to the client")}
                          disabled={d.statut !== "BROUILLON"}
                        >
                          Send to client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => comingSoon("Generate the deposit invoice")}
                          disabled={d.statut !== "ACCEPTE"}
                        >
                          Deposit invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => comingSoon("Generate the balance invoice")}
                          disabled={d.statut !== "ACCEPTE"}
                        >
                          Balance invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
