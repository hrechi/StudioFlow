"use client";

import { Banknote, ReceiptText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  MODES_PAIEMENT,
  modePaiementLabels,
  statutFactureConfig,
  typeFactureConfig,
  type StatutFacture,
} from "../facturation.types";
import type { FactureAvecContexte } from "../mock-data";

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
                        <span className="font-semibold text-charcoal">{f.numero}</span>
                        <StatusBadge
                          value={f.type}
                          config={typeFactureConfig}
                          dot={false}
                          className="h-5 px-2 text-[0.65rem]"
                        />
                      </span>
                      <span className="text-xs text-muted-foreground">Quote {f.devis.numero}</span>
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
                        <span className="font-semibold text-charcoal">
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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reste <= 0}
                        onClick={() => setPaying(f)}
                      >
                        <Banknote aria-hidden />
                        Payment
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              {paying &&
                `${paying.numero} · remaining ${formatCurrency(paying.montantTTC - paying.montantPaye)}`}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPaying(null);
              comingSoon("Record the payment (facture.enregistrerPaiement)");
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField id="montant" label="Amount (TND)" required>
                <Input
                  id="montant"
                  type="number"
                  min={1}
                  defaultValue={paying ? paying.montantTTC - paying.montantPaye : 0}
                  className="h-10 bg-white"
                />
              </FormField>
              <FormField id="date-paiement" label="Date" required>
                <Input
                  id="date-paiement"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="h-10 bg-white"
                />
              </FormField>
            </div>
            <FormField id="mode" label="Payment method" required>
              <Select defaultValue="VIREMENT">
                <SelectTrigger id="mode" className="h-10 w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES_PAIEMENT.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {modePaiementLabels[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
