/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Hash,
  Link2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { formatDate } from "@/lib/utils";
import { ContratSignButton } from "@/modules/contrats/components/contrat-sign-button";
import { AncrageStatusBadge, ContratStatusBadge } from "@/modules/contrats/components/contrat-status-badge";
import { getContrat, NotFoundError } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "Contract" };

export default async function ClientContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireArea("espace-client");
  const { id } = await params;

  const contrat = await getContrat(id, actor).catch((err: unknown) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  const bc = contrat.blockchain;
  const canSign = contrat.statut === "ENVOYE";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/espace-client/contrats"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            My contracts
          </Link>
        }
        title={contrat.titre}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ContratStatusBadge statut={contrat.statut} />
            <span className="font-mono text-xs text-muted-foreground">{contrat.reference}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Main ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Contract content */}
          {contrat.modeCreation === "CHAMPS" && contrat.contenu?.champs && (
            <Card>
              <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {(() => {
                  const ch = contrat.contenu!.champs!;
                  const rows: [string, string][] = [
                    ["Services & deliverables", ch.prestations],
                    ...(ch.dateSeance ? [["Session date", ch.dateSeance] as [string, string]] : []),
                    ...(ch.lieuSeance ? [["Location", ch.lieuSeance] as [string, string]] : []),
                    ...(ch.montantTTC !== undefined
                      ? [["Amount (incl. VAT)", `${ch.montantTTC.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`] as [string, string]]
                      : []),
                    ...(ch.conditionsAnnulation ? [["Cancellation terms", ch.conditionsAnnulation] as [string, string]] : []),
                    ...(ch.delaiLivraison ? [["Delivery timeline", ch.delaiLivraison] as [string, string]] : []),
                    ...(ch.clausesSupplementaires ? [["Additional clauses", ch.clausesSupplementaires] as [string, string]] : []),
                  ];
                  return rows.map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{v}</p>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}

          {contrat.modeCreation === "LIBRE" && contrat.contenu?.texteLibre && (
            <Card>
              <CardHeader><CardTitle>Contract terms</CardTitle></CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                  {contrat.contenu.texteLibre}
                </pre>
              </CardContent>
            </Card>
          )}

          {contrat.modeCreation === "UPLOAD" && (
            <Card>
              <CardHeader><CardTitle>Contract document</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm">
                <FileText className="size-8 shrink-0 text-primary-text" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{contrat.reference}.pdf</p>
                  <Link
                    href={`/api/contrats/${contrat.id}/pdf`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-primary-text underline underline-offset-2"
                  >
                    Read the contract <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature block */}
          {canSign && (
            <Card>
              <CardHeader>
                <CardTitle>Sign this contract</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please read the contract carefully before signing. By accepting, you agree
                  to all the terms above. Your acceptance will be recorded on the blockchain.
                </p>
                <ContratSignButton contratId={contrat.id} />
              </CardContent>
            </Card>
          )}

          {/* Blockchain */}
          {bc && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="size-4 text-primary-text" aria-hidden />
                  Blockchain certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <AncrageStatusBadge statut={bc.statut} />
                  {bc.ancreLe && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(bc.ancreLe))}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                      SHA-256 fingerprint
                    </p>
                    <p className="mt-0.5 break-all font-mono text-foreground">{bc.sha256}</p>
                  </div>
                  {bc.txHash && (
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                        Transaction hash
                      </p>
                      <p className="mt-0.5 break-all font-mono text-foreground">{bc.txHash}</p>
                    </div>
                  )}
                </div>
                {bc.statut === "ANCRE" && (
                  <Link
                    href={`/verifier-contrat?hash=${bc.sha256}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text underline underline-offset-2"
                  >
                    <Link2 className="size-3.5" aria-hidden />
                    Verify the integrity of this contract
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────── */}
        <div className="space-y-5">
          {/* Studio info */}
          <Card>
            <CardHeader><CardTitle>Studio</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">ReFrame Photography Studio</p>
              <p>contact@reframe.tn</p>
              <p>+216 70 000 000</p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Sent", contrat.dateEnvoi],
                ["Answered", contrat.dateReponse],
              ]
                .filter(([, d]) => d)
                .map(([label, d]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{formatDate(new Date(d!))}</span>
                  </div>
                ))}
              {contrat.motifRefus && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive-text">
                  {contrat.motifRefus}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download */}
          <Card>
            <CardHeader><CardTitle>Document</CardTitle></CardHeader>
            <CardContent>
              <Link
                href={`/api/contrats/${contrat.id}/pdf`}
                target="_blank"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <FileText className="size-4" aria-hidden />
                Download PDF
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
