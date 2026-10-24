"use client";

import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { rejectDeclarationAction, validateDeclarationAction } from "../facturation.actions";
import { AnalysePreuvePanel } from "./analyse-preuve";
import {
  modePaiementLabels,
  statutDeclarationConfig,
  type DeclarationPaiement,
} from "../facturation.types";

/**
 * Payments the client declared on one invoice. The studio opens the proof, checks its bank / cash
 * box, then confirms (the payment is recorded and the client notified) or rejects with a reason.
 */
export function DeclarationsReview({
  devisId,
  factureId,
  declarations,
}: {
  devisId: string;
  factureId: string;
  declarations: DeclarationPaiement[];
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState<DeclarationPaiement | null>(null);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  if (declarations.length === 0) return null;

  const validate = (d: DeclarationPaiement) =>
    start(async () => {
      setBusy(d.id);
      const result = await validateDeclarationAction(devisId, factureId, d.id);
      setBusy(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Payment confirmed", { description: "The client was notified and the invoice is updated." });
      router.refresh();
    });

  const reject = () =>
    start(async () => {
      if (!rejecting) return;
      setBusy(rejecting.id);
      const result = await rejectDeclarationAction(devisId, factureId, rejecting.id, { motif });
      setBusy(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Proof rejected", { description: "The client was told why and can send another one." });
      setRejecting(null);
      setMotif("");
      router.refresh();
    });

  return (
    <div className="space-y-2">
      {[...declarations].reverse().map((d) => (
        <div
          key={d.id}
          className={
            d.statut === "EN_ATTENTE"
              ? "rounded-lg border border-warning-text/40 bg-warning-text/5 p-3"
              : "rounded-lg border p-3 opacity-80"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge value={d.statut} config={statutDeclarationConfig} />
              <span className="font-semibold text-foreground">{formatCurrency(d.montant)}</span>
              <span className="text-slate">
                {modePaiementLabels[d.modePaiement]} · paid {formatDate(d.date)}
                {d.reference && ` · ref. ${d.reference}`}
              </span>
            </div>
            {d.preuve ? (
              <a
                href={`/api/facturation/preuves/${d.preuve.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                View proof ({d.preuve.contentType === "application/pdf" ? "PDF" : "image"})
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">No file attached</span>
            )}
          </div>
          {d.commentaire && <p className="mt-2 text-xs text-slate">“{d.commentaire}”</p>}
          {d.preuve && <AnalysePreuvePanel devisId={devisId} factureId={factureId} declaration={d} />}
          {d.statut === "REJETEE" && d.motifRejet && (
            <p className="mt-2 text-xs text-destructive-text">Rejected: {d.motifRejet}</p>
          )}
          {d.statut === "EN_ATTENTE" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => validate(d)} disabled={busy === d.id}>
                {busy === d.id ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                Money received — confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(d)} disabled={busy === d.id}>
                <X aria-hidden />
                Reject
              </Button>
            </div>
          )}
        </div>
      ))}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this proof?</DialogTitle>
            <DialogDescription>
              {rejecting && `${formatCurrency(rejecting.montant)} by ${modePaiementLabels[rejecting.modePaiement].toLowerCase()}.`} The
              client sees your reason and can send a corrected proof.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. No transfer of this amount received on our account yet."
            aria-label="Reason"
            className="bg-card"
          />
          <DialogFooter>
            <Button variant="destructive" onClick={reject} disabled={motif.trim().length < 5 || !!busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
              Reject proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
