"use client";

import { Check, Download, FileText, Receipt, X } from "lucide-react";
import { useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  statutDevisConfig,
  statutFactureConfig,
  typeFactureConfig,
  type Devis,
} from "../facturation.types";
import type { FactureAvecContexte } from "../mock-data";

/** /espace-client/factures — quotes to accept/refuse, invoices with paid/remaining. */
export function ClientBilling({
  devis,
  factures,
}: {
  devis: Devis[];
  factures: FactureAvecContexte[];
}) {
  const [decision, setDecision] = useState<{ devis: Devis; accept: boolean } | null>(null);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-charcoal">
          <FileText className="size-5 text-primary" aria-hidden />
          My quotes
        </h2>
        {devis.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes"
            description="Your quotes will appear here as soon as the studio sends them."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {devis.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{d.seance.titre}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {d.numero} · valid until {formatDate(d.dateValidite)}
                    </p>
                  </div>
                  <StatusBadge value={d.statut} config={statutDevisConfig} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5 text-sm">
                    {d.prestations.map((p) => (
                      <li key={p.designation} className="flex justify-between gap-3 text-slate">
                        <span>
                          {p.designation}
                          {p.quantite > 1 && (
                            <span className="text-muted-foreground"> × {p.quantite}</span>
                          )}
                        </span>
                        <span className="shrink-0">
                          {formatCurrency(p.quantite * p.prixUnitaire)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Total incl. VAT</span>
                    <span className="text-xl font-bold text-charcoal">
                      {formatCurrency(d.montantTTC)}
                    </span>
                  </div>
                  {d.statut === "ENVOYE" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setDecision({ devis: d, accept: false })}
                      >
                        <X aria-hidden />
                        Decline
                      </Button>
                      <Button onClick={() => setDecision({ devis: d, accept: true })}>
                        <Check aria-hidden />
                        Accept
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => comingSoon("Download the quote (PDF)")}
                    >
                      <Download aria-hidden />
                      Download PDF
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-charcoal">
          <Receipt className="size-5 text-primary" aria-hidden />
          My invoices
        </h2>
        {factures.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices" />
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {factures.map((f) => {
                const reste = f.montantTTC - f.montantPaye;
                return (
                  <li key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-charcoal">{f.numero}</span>
                        <StatusBadge
                          value={f.type}
                          config={typeFactureConfig}
                          dot={false}
                          className="h-5 px-2 text-[0.65rem]"
                        />
                        <StatusBadge value={f.statut} config={statutFactureConfig} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {f.devis.seance.titre} · due {formatDate(f.dateEcheance)}
                      </p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="flex justify-between text-xs">
                        <span className="text-success-text">
                          Paid {formatCurrency(f.montantPaye)}
                        </span>
                        <span
                          className={
                            reste > 0 ? "font-semibold text-charcoal" : "text-muted-foreground"
                          }
                        >
                          Remaining {formatCurrency(reste)}
                        </span>
                      </div>
                      <Progress
                        value={(f.montantPaye / f.montantTTC) * 100}
                        className="mt-1.5"
                        aria-label="Amount paid"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => comingSoon("Download the invoice (PDF)")}
                    >
                      <Download aria-hidden />
                      PDF
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <ConfirmDialog
        open={!!decision}
        onOpenChange={(open) => !open && setDecision(null)}
        tone={decision?.accept ? "default" : "destructive"}
        title={decision?.accept ? "Accept this quote?" : "Decline this quote?"}
        description={
          decision?.accept
            ? `The studio will send you the deposit invoice for "${decision.devis.seance.titre}".`
            : "The studio will be notified. You can ask for a new quote."
        }
        confirmLabel={decision?.accept ? "Accept quote" : "Decline quote"}
        onConfirm={() => {
          setDecision(null);
          comingSoon(decision?.accept ? "Accept the quote" : "Decline the quote");
        }}
      />
    </div>
  );
}
