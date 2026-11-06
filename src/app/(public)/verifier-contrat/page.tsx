/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Hash,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { verifierContrat } from "@/modules/contrats/contrat.service";
import { VerifierForm } from "./verifier-form";

export const metadata: Metadata = { title: "Verify a contract — ReFrame" };

const STATUS_CONFIG = {
  ACTIF: {
    icon: CheckCircle2,
    color: "text-success-text",
    bg: "bg-success/10",
    label: "Valid — unchanged",
    desc: "This document matches the fingerprint registered on the blockchain. It has not been modified.",
  },
  REVOQUE: {
    icon: XCircle,
    color: "text-destructive-text",
    bg: "bg-destructive/10",
    label: "Revoked",
    desc: "This contract has been revoked by the studio. It is no longer valid.",
  },
  REMPLACE: {
    icon: AlertTriangle,
    color: "text-warning-text",
    bg: "bg-warning/10",
    label: "Superseded",
    desc: "This version has been replaced by an amendment. Check the latest version.",
  },
  INCONNU: {
    icon: XCircle,
    color: "text-destructive-text",
    bg: "bg-destructive/10",
    label: "Not found",
    desc: "No contract matching this fingerprint was found on the blockchain. The document may have been modified.",
  },
};

export default async function VerifierContratPage({
  searchParams,
}: {
  searchParams: Promise<{ hash?: string }>;
}) {
  const { hash } = await searchParams;
  const cleanHash = typeof hash === "string" ? hash.trim().toLowerCase() : undefined;
  const isValidHash = cleanHash && /^[0-9a-f]{64}$/.test(cleanHash);

  let result: Awaited<ReturnType<typeof verifierContrat>> | null = null;
  let verifyError: string | null = null;

  if (isValidHash) {
    try {
      result = await verifierContrat(cleanHash);
    } catch {
      verifyError = "Unable to reach the blockchain node. Please try again later.";
    }
  }

  const statusKey = result
    ? result.found
      ? result.statut
      : "INCONNU"
    : null;
  const cfg = statusKey ? STATUS_CONFIG[statusKey] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="size-7 text-primary-text" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Contract integrity check
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload the PDF or paste its SHA-256 fingerprint to verify it has not been modified
          since it was registered on the blockchain.
        </p>
      </div>

      {/* Form */}
      <VerifierForm initialHash={cleanHash} />

      {/* Error */}
      {hash && !isValidHash && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-5 text-sm text-destructive-text">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            Invalid SHA-256 fingerprint. It must be a 64-character hexadecimal string.
          </CardContent>
        </Card>
      )}

      {verifyError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-5 text-sm text-destructive-text">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            {verifyError}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && cfg && statusKey && (
        <Card className={cn("border", cfg.bg)}>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", cfg.color)}>
              <cfg.icon className="size-5" aria-hidden />
              {cfg.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{cfg.desc}</p>

            {result.found && (
              <dl className="space-y-3">
                {result.reference && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reference
                    </dt>
                    <dd className="mt-0.5 font-mono text-foreground">{result.reference}</dd>
                  </div>
                )}
                {result.enregistreLe && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Registered on
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatDate(new Date(result.enregistreLe))}
                    </dd>
                  </div>
                )}
                {result.coSigneLe && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Client co-signed on
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatDate(new Date(result.coSigneLe))}
                    </dd>
                  </div>
                )}
                {result.remplacePar && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Replaced by
                    </dt>
                    <dd className="mt-0.5 break-all font-mono text-xs text-foreground">
                      {result.remplacePar}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SHA-256 fingerprint
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-foreground">
                    {cleanHash}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      {!result && !verifyError && (
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="size-4" aria-hidden />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              When a client accepts a contract, ReFrame freezes the PDF, computes its
              SHA-256 fingerprint and registers it on a blockchain smart contract.
            </p>
            <p>
              To verify: upload your PDF (fingerprint computed in your browser) or paste
              the hash. We compare it with the on-chain record. Any modification — even
              a single character — produces a different hash and fails verification.
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-success-text">
              <FileSearch className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <strong>Privacy:</strong> no data is uploaded to our server. The PDF hash
                is computed locally in your browser, then checked against the public
                blockchain record (read-only, no wallet needed).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
