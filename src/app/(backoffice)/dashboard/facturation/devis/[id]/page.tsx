/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AIBadge } from "@/components/shared/ai-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DevisActions } from "@/modules/facturation/components/devis-actions";
import { DevisFactures } from "@/modules/facturation/components/devis-factures";
import { getDevis, NotFoundError } from "@/modules/facturation/devis.service";
import { statutDevisConfig } from "@/modules/facturation/facturation.types";

export const metadata: Metadata = { title: "Quote" };

const ACTIONS: Record<string, string> = {
  CREATE: "Quote created",
  UPDATE: "Quote edited",
  SEND: "Sent to the client",
  WITHDRAW: "Taken back to draft",
  ACCEPT: "Accepted by the client",
  REFUSE: "Declined by the client",
  INVOICES: "Invoices issued",
  INVOICES_CANCEL: "Invoices cancelled",
  INVOICE_DEPOSIT: "Deposit invoice generated",
  INVOICE_BALANCE: "Balance invoice generated",
  INVOICE_DELETE: "Invoice deleted",
  PAYMENT: "Payment recorded",
};

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireArea("facturation");
  const { id } = await params;
  const devis = await getDevis(id, user).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const facture = devis.factures.reduce((sum, f) => sum + f.montantTTC, 0);
  const paye = devis.factures.reduce((sum, f) => sum + f.montantPaye, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/facturation/devis"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Quotes
          </Link>
        }
        title={devis.numero}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={devis.statut} config={statutDevisConfig} />
            {devis.genereParIA && <AIBadge />}
            <span>
              {devis.client.prenom} {devis.client.nom} ·{" "}
              <Link href={`/dashboard/seances/${devis.seance.id}`} className="underline-offset-2 hover:underline">
                {devis.seance.titre}
              </Link>
            </span>
          </span>
        }
        actions={<DevisActions devis={devis} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit price</th>
                    <th className="py-2 text-right">Total excl. VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {devis.prestations.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 text-foreground">{p.designation}</td>
                      <td className="py-2.5 text-right text-slate">{p.quantite}</td>
                      <td className="py-2.5 text-right text-slate">{formatCurrency(p.prixUnitaire)}</td>
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {formatCurrency(p.quantite * p.prixUnitaire)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {devis.commentaire && (
                <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-line text-slate">
                  {devis.commentaire}
                </p>
              )}
            </CardContent>
          </Card>
          <DevisFactures devis={devis} />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-slate">
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(devis.sousTotal ?? devis.montantHT)}</dd>
                </div>
                <div className="flex justify-between text-slate">
                  <dt>Discount {devis.remise}%</dt>
                  <dd>− {formatCurrency((devis.sousTotal ?? devis.montantHT) - devis.montantHT)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <dt>Total excl. VAT</dt>
                  <dd>{formatCurrency(devis.montantHT)}</dd>
                </div>
                <div className="flex justify-between text-slate">
                  <dt>VAT {devis.tva}%</dt>
                  <dd>{formatCurrency(devis.montantTVA ?? 0)}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-bold text-foreground">
                  <dt>Total incl. VAT</dt>
                  <dd>{formatCurrency(devis.montantTTC)}</dd>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <dt>Deposit {devis.tauxAcompte}%</dt>
                  <dd>{formatCurrency((devis.montantTTC * (devis.tauxAcompte ?? 0)) / 100)}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 text-slate">
                  <dt>Invoiced</dt>
                  <dd>{formatCurrency(facture)}</dd>
                </div>
                <div className="flex justify-between text-slate">
                  <dt>Collected</dt>
                  <dd>{formatCurrency(paye)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-slate">
                  <dt>Issued</dt>
                  <dd>{formatDate(devis.dateEmission)}</dd>
                </div>
                <div className="flex justify-between text-slate">
                  <dt>Valid until</dt>
                  <dd>{formatDate(devis.dateValidite)}</dd>
                </div>
                {devis.seance.date && (
                  <div className="flex justify-between text-slate">
                    <dt>Session</dt>
                    <dd>{formatDate(devis.seance.date)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {[...(devis.historique ?? [])].reverse().map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-foreground">{ACTIONS[h.action] ?? h.action}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(h.date)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
