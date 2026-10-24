"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { reanalyserPreuveAction } from "../facturation.actions";
import { verdictAnalyseConfig, type AnalysePreuve, type DeclarationPaiement } from "../facturation.types";

const ICONS = {
  ok: <CheckCircle2 className="size-3.5 shrink-0 text-success-text" aria-hidden />,
  attention: <AlertTriangle className="size-3.5 shrink-0 text-warning-text" aria-hidden />,
  ecart: <XCircle className="size-3.5 shrink-0 text-destructive-text" aria-hidden />,
};

/**
 * What the AI read on the proof next to what the client declared, and the checks computed from it.
 * Advisory only: the admin still confirms the money is on the account.
 */
export function AnalysePreuvePanel({
  devisId,
  factureId,
  declaration,
}: {
  devisId: string;
  factureId: string;
  declaration: DeclarationPaiement;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const analyse: AnalysePreuve | undefined = declaration.analyseIA;
  const enCours = analyse?.verdict === "EN_COURS";

  // While Gemini is reading (a few seconds, after the upload), refresh until the verdict lands.
  useEffect(() => {
    if (!enCours) return;
    const timer = setInterval(() => router.refresh(), 3000);
    const stop = setTimeout(() => clearInterval(timer), 90_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [enCours, router]);

  if (!declaration.preuve) return null;

  const relancer = () =>
    start(async () => {
      const result = await reanalyserPreuveAction(devisId, factureId, declaration.id);
      if (!result.ok) return void toast.error(result.error);
      router.refresh();
    });

  const x = analyse?.extrait;
  const lignes: [string, string, string | null | undefined][] = [
    ["Amount", formatCurrency(declaration.montant), x?.montant != null ? `${formatCurrency(x.montant)}${x.devise && x.devise !== "TND" ? ` (${x.devise})` : ""}` : null],
    ["Date", formatDate(declaration.date), x?.date ? formatDate(x.date) : null],
    ["Reference", declaration.reference ?? "—", x?.reference],
  ];
  if (x?.beneficiaire) lignes.push(["Payee", "ReFrame", x.beneficiaire]);
  if (x?.emetteur) lignes.push(["Paid by", "—", x.emetteur]);
  if (x?.banque) lignes.push(["Bank", "—", x.banque]);

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border p-3",
        analyse?.verdict === "CONCORDE" && "border-success-text/30 bg-success-text/5",
        analyse?.verdict === "ECART" && "border-destructive-text/40 bg-destructive-text/5",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-ai" aria-hidden />
          AI proof check
          {analyse ? (
            <StatusBadge value={analyse.verdict} config={verdictAnalyseConfig} />
          ) : (
            <span className="font-normal text-muted-foreground">not run yet</span>
          )}
          {enCours && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
        </span>
        {!enCours && (
          <Button size="sm" variant="ghost" onClick={relancer} disabled={pending} className="h-7 text-xs">
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            {analyse ? "Check again" : "Run AI check"}
          </Button>
        )}
      </div>

      {analyse && !enCours && (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-slate">{analyse.resume}</p>
          {x && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                  <th className="py-1 font-semibold" />
                  <th className="py-1 font-semibold">Declared</th>
                  <th className="py-1 font-semibold">Read on the proof</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(([label, declare, lu]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-1 pr-2 text-muted-foreground">{label}</td>
                    <td className="py-1 pr-2 text-foreground">{declare}</td>
                    <td className="py-1 text-foreground">{lu ?? <span className="text-muted-foreground">not found</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {analyse.verifications.length > 0 && (
            <ul className="space-y-1">
              {analyse.verifications.map((v, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  {ICONS[v.statut]}
                  <span>
                    <span className="text-foreground">{v.label}</span>
                    {v.detail && <span className="text-muted-foreground"> — {v.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.65rem] text-muted-foreground">
            Advisory only{analyse.confiance !== undefined && ` · readability ${Math.round(analyse.confiance * 100)}%`}
            {analyse.analyseLe && ` · checked ${formatDate(analyse.analyseLe)}`}. Always confirm the money reached the account.
          </p>
        </div>
      )}
    </div>
  );
}
