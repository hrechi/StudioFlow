"use client";

import { FileSearch, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { pdfHref, statutDevisConfig, type Devis, type StatutDevis } from "../facturation.types";
import { needsInvoices, useDevisCommands } from "./devis-actions";

/** /dashboard/facturation/devis — quotes list. */
export function DevisList({ devis }: { devis: Devis[] }) {
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<StatutDevis | typeof ALL>(ALL);
  const [deleting, setDeleting] = useState<Devis | null>(null);
  const commands = useDevisCommands();
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
                    <Link
                      href={`/dashboard/facturation/devis/${d.id}`}
                      className="flex items-center gap-2 font-semibold text-foreground hover:underline"
                    >
                      {d.numero}
                      {d.genereParIA && <AIBadge />}
                    </Link>
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
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-foreground">
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/facturation/devis/${d.id}`}>View details</Link>
                        </DropdownMenuItem>
                        {d.statut === "BROUILLON" && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/facturation/devis/${d.id}/modifier`}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => commands.send(d)}>
                              Send to client
                            </DropdownMenuItem>
                          </>
                        )}
                        {(d.statut === "ENVOYE" || d.statut === "EXPIRE") && (
                          <DropdownMenuItem onSelect={() => commands.withdraw(d)}>
                            Back to draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => commands.duplicate(d)}>
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={pdfHref(d.id)} download>
                            Download PDF
                          </a>
                        </DropdownMenuItem>
                        {needsInvoices(d) && (
                          <DropdownMenuItem onSelect={() => commands.issueInvoices(d)}>
                            Issue invoices
                          </DropdownMenuItem>
                        )}
                        {d.factures.length === 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(d)}>
                              {d.statut === "BROUILLON" ? "Delete" : "Archive"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="destructive"
        title={deleting?.statut === "BROUILLON" ? "Delete this draft?" : "Archive this quote?"}
        description={
          deleting?.statut === "BROUILLON"
            ? "The draft will be permanently deleted."
            : "The client has already seen this quote: it is archived and hidden from the lists."
        }
        confirmLabel={deleting?.statut === "BROUILLON" ? "Delete" : "Archive"}
        onConfirm={() => {
          if (deleting) commands.remove(deleting);
          setDeleting(null);
        }}
      />
    </Card>
  );
}
