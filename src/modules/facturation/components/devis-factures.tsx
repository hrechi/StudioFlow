"use client";

import { Banknote, Download, ReceiptText, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { cancelFacturesAction } from "../facturation.actions";
import {
  factureTypeLabel,
  modePaiementLabels,
  pdfHref,
  planPaiementLabels,
  statutFactureConfig,
  type Devis,
  type Facture,
} from "../facturation.types";
import { PaiementDialog } from "./paiement-dialog";

/**
 * Invoices of one quote (detail page). They are issued when the client accepts, following the
 * plan they chose; the studio's job here is to confirm each payment it receives.
 */
export function DevisFactures({ devis }: { devis: Devis }) {
  const router = useRouter();
  const [paying, setPaying] = useState<Facture | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pending, start] = useTransition();
  const hasPayments = devis.factures.some((f) => (f.paiements?.length ?? 0) > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Invoices</CardTitle>
          {devis.planPaiement && (
            <CardDescription>
              Client&apos;s choice: {planPaiementLabels[devis.planPaiement].toLowerCase()}
              {devis.modePaiementPrefere && ` · ${modePaiementLabels[devis.modePaiementPrefere].toLowerCase()}`}
            </CardDescription>
          )}
        </div>
        {devis.factures.length > 0 && !hasPayments && (
          <Button size="sm" variant="ghost" onClick={() => setCancelling(true)}>
            <XCircle aria-hidden />
            Cancel invoices
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {devis.factures.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description={
              devis.statut === "ACCEPTE"
                ? "Use “Issue invoices” above to create them from the client's plan."
                : "Invoices are issued automatically when the client accepts the quote and chooses how to pay."
            }
          />
        ) : (
          <ul className="divide-y">
            {devis.factures.map((f) => {
              const reste = f.montantTTC - f.montantPaye;
              return (
                <li key={f.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{f.numero}</span>
                        <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-border">
                          {factureTypeLabel(f)}
                        </span>
                        <StatusBadge value={f.statut} config={statutFactureConfig} />
                      </div>
                      <p className={cn("text-xs", f.statut === "EN_RETARD" ? "font-semibold text-destructive-text" : "text-muted-foreground")}>
                        Issued {formatDate(f.dateEmission)} · due {formatDate(f.dateEcheance)}
                      </p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{formatCurrency(f.montantPaye)}</span>
                        <span className="text-muted-foreground">/ {formatCurrency(f.montantTTC)}</span>
                      </div>
                      <Progress value={(f.montantPaye / f.montantTTC) * 100} className="mt-1.5" aria-label="Amount paid" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={reste <= 0} onClick={() => setPaying(f)}>
                        <Banknote aria-hidden />
                        Payment received
                      </Button>
                      <Button size="icon-sm" variant="ghost" asChild>
                        <a href={pdfHref(devis.id, f.id)} download aria-label={`Download ${f.numero} (PDF)`}>
                          <Download aria-hidden />
                        </a>
                      </Button>
                    </div>
                  </div>
                  {(f.paiements?.length ?? 0) > 0 && (
                    <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-slate">
                      {f.paiements!.map((p, i) => (
                        <li key={i} className="flex flex-wrap justify-between gap-2">
                          <span>
                            {formatDate(p.date)} · {modePaiementLabels[p.modePaiement]}
                            {p.reference && <span className="text-muted-foreground"> · {p.reference}</span>}
                          </span>
                          <span className="font-semibold text-foreground">{formatCurrency(p.montant)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <PaiementDialog
        devisId={devis.id}
        facture={paying}
        defaultMode={devis.modePaiementPrefere}
        onOpenChange={(open) => !open && setPaying(null)}
      />
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        tone="destructive"
        title="Cancel all invoices of this quote?"
        description="Use this to correct a mistake before any payment. You can then issue them again from the client's plan."
        confirmLabel="Cancel invoices"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const result = await cancelFacturesAction(devis.id);
            setCancelling(false);
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Invoices cancelled");
              router.refresh();
            }
          })
        }
      />
    </Card>
  );
}
