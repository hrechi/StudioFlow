/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Link2,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { cn, formatDate } from "@/lib/utils";
import { ContratActions } from "@/modules/contrats/components/contrat-actions";
import { AncrageStatusBadge, ContratStatusBadge } from "@/modules/contrats/components/contrat-status-badge";
import { getContrat, NotFoundError } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "Contract" };

const MODE_LABELS = {
  CHAMPS: "Structured fields",
  LIBRE: "Free text",
  UPLOAD: "Uploaded PDF",
};

const HISTORY_LABELS: Record<string, string> = {
  CREATE: "Contract created",
  SEND: "Sent to client",
  ACCEPT: "Accepted by client",
  DECLINE: "Declined by client",
  REVOKE: "Revoked",
};

export default async function ContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireArea("contrats");
  const { id } = await params;

  const contrat = await getContrat(id, actor).catch((err: unknown) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  const bc = contrat.blockchain;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/contrats"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Contracts
          </Link>
        }
        title={contrat.titre}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ContratStatusBadge statut={contrat.statut} />
            <span className="font-mono text-xs text-muted-foreground">{contrat.reference}</span>
            <span className="text-xs text-muted-foreground">
              {MODE_LABELS[contrat.modeCreation]}
            </span>
          </span>
        }
        actions={<ContratActions contrat={contrat} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Main ───────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Content preview */}
          {contrat.modeCreation === "CHAMPS" && contrat.contenu?.champs && (
            <Card>
              <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {(() => {
                  const ch = contrat.contenu!.champs!;
                  const rows: [string, string][] = [
                    ["Client", `${ch.nomClient} · ${ch.emailClient}`],
                    ...(ch.dateSeance ? [["Session date", ch.dateSeance] as [string, string]] : []),
                    ...(ch.lieuSeance ? [["Location", ch.lieuSeance] as [string, string]] : []),
                    ["Services", ch.prestations],
                    ...(ch.montantTTC !== undefined
                      ? [["Amount (incl. VAT)", `${ch.montantTTC.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`] as [string, string]]
                      : []),
                    ...(ch.conditionsAnnulation ? [["Cancellation", ch.conditionsAnnulation] as [string, string]] : []),
                    ...(ch.delaiLivraison ? [["Delivery", ch.delaiLivraison] as [string, string]] : []),
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
              <CardHeader><CardTitle>Contract text</CardTitle></CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                  {contrat.contenu.texteLibre}
                </pre>
              </CardContent>
            </Card>
          )}

          {contrat.modeCreation === "UPLOAD" && (
            <Card>
              <CardHeader><CardTitle>Uploaded PDF</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileText className="size-8 shrink-0 text-primary-text" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{contrat.reference}.pdf</p>
                  <Link
                    href={`/api/contrats/${contrat.id}/pdf`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-primary-text underline underline-offset-2"
                  >
                    Download <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockchain certificate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="size-4 text-primary-text" aria-hidden />
                Blockchain certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!bc ? (
                <p className="text-sm text-muted-foreground">
                  The contract will be anchored on the blockchain once the client accepts it.
                </p>
              ) : (
                <>
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
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">SHA-256</p>
                      <p className="mt-0.5 break-all font-mono text-foreground">{bc.sha256}</p>
                    </div>
                    {bc.txHash && (
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-muted-foreground">Transaction</p>
                        <p className="mt-0.5 break-all font-mono text-foreground">{bc.txHash}</p>
                      </div>
                    )}
                    {bc.blockNumber && (
                      <div className="flex gap-6">
                        <div>
                          <p className="font-semibold uppercase tracking-wider text-muted-foreground">Block</p>
                          <p className="mt-0.5 font-mono text-foreground">#{bc.blockNumber}</p>
                        </div>
                        {bc.chainId && (
                          <div>
                            <p className="font-semibold uppercase tracking-wider text-muted-foreground">Chain ID</p>
                            <p className="mt-0.5 font-mono text-foreground">{bc.chainId}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {bc.erreur && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive-text">
                        {bc.erreur}
                      </p>
                    )}
                  </div>
                  {bc.statut === "ANCRE" && (
                    <Link
                      href={`/verifier-contrat?hash=${bc.sha256}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text underline underline-offset-2"
                    >
                      <Link2 className="size-3.5" aria-hidden />
                      Verify on public page
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Client */}
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">
                {contrat.client.prenom} {contrat.client.nom}
              </p>
              <p className="text-muted-foreground">{contrat.client.email}</p>
              {contrat.clientWallet && (
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallet</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-foreground">{contrat.clientWallet}</p>
                </div>
              )}
              {contrat.clientSignedAt && (
                <p className="text-xs text-success-text">
                  ✓ Co-signed on-chain {formatDate(new Date(contrat.clientSignedAt))}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Created", contrat.createdAt],
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
            <CardHeader><CardTitle>PDF</CardTitle></CardHeader>
            <CardContent>
              <Link
                href={`/api/contrats/${contrat.id}/pdf`}
                target="_blank"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <FileText className="size-4" aria-hidden />
                Download PDF
              </Link>
              {bc?.statut === "ANCRE" && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  This is the frozen PDF matching the blockchain hash.
                </p>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-xs">
                {[...contrat.historique ?? []].reverse?.().map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className={cn(
                      "mt-0.5 size-5 shrink-0 flex items-center justify-center rounded-full",
                      h.statutApres === "ACCEPTE" ? "bg-success/10 text-success-text"
                      : h.statutApres === "REFUSE" || h.statutApres === "REVOQUE"
                        ? "bg-destructive/10 text-destructive-text"
                      : "bg-muted text-muted-foreground",
                    )}>
                      {h.statutApres === "ACCEPTE" ? (
                        <CheckCircle2 className="size-3" aria-hidden />
                      ) : h.statutApres === "REFUSE" || h.statutApres === "REVOQUE" ? (
                        <XCircle className="size-3" aria-hidden />
                      ) : (
                        <Clock className="size-3" aria-hidden />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {HISTORY_LABELS[h.action] ?? h.action}
                      </p>
                      <p className="text-muted-foreground">
                        {h.date ? formatDate(new Date(h.date)) : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
