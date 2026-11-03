"use client";

import { Check, Download, FileText, Loader2, Receipt, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  factureTypeLabel,
  MODES_PAIEMENT,
  modePaiementLabels,
  pdfHref,
  planPaiementLabels,
  statutDevisConfig,
  statutFactureConfig,
  type Devis,
  type ModePaiement,
  type PlanPaiement,
} from "../facturation.types";
import type { FactureAvecContexte } from "../facturation.types";
import { answerDevisAction } from "../facturation.actions";
import { ClientPaiementActions, type Passerelle } from "./client-paiement";

/** /espace-client/factures — quotes to accept/refuse, invoices with paid/remaining. */
export function ClientBilling({
  devis,
  factures,
  passerelles,
  tauxEur,
  retourPaiement,
}: {
  devis: Devis[];
  factures: FactureAvecContexte[];
  /** Online gateways available: Konnect (TND), Stripe (test, EUR) or the local test checkout. */
  passerelles: Passerelle[];
  /** TND → EUR rate used by Stripe, to show the approximate charge. */
  tauxEur: number;
  /** Outcome when coming back from the online checkout (?paiement=…). */
  retourPaiement?: "success" | "pending" | "failed";
}) {
  const router = useRouter();
  const shown = useRef(false);
  useEffect(() => {
    if (!retourPaiement || shown.current) return;
    shown.current = true;
    if (retourPaiement === "success") toast.success("Payment confirmed", { description: "Your invoice is updated; download it below." });
    else if (retourPaiement === "pending") toast.info("Payment being processed", { description: "Refresh in a moment: the invoice updates as soon as the gateway confirms." });
    else toast.error("Payment not completed", { description: "Nothing was charged. You can try again or send a proof of another payment." });
    router.replace("/espace-client/factures", { scroll: false });
  }, [retourPaiement, router]);
  const [accepting, setAccepting] = useState<Devis | null>(null);
  const [declining, setDeclining] = useState<Devis | null>(null);
  const [pending, start] = useTransition();

  const decline = () =>
    start(async () => {
      if (!declining) return;
      const result = await answerDevisAction(declining.id, { accept: false });
      setDeclining(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Quote declined");
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
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
                    {d.prestations.map((p, i) => (
                      <li key={i} className="flex justify-between gap-3 text-slate">
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
                  {d.commentaire && (
                    <p className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-line text-slate">
                      {d.commentaire}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Total incl. VAT</span>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(d.montantTTC)}
                    </span>
                  </div>
                  {d.planPaiement && (
                    <p className="text-xs text-muted-foreground">
                      {planPaiementLabels[d.planPaiement]}
                      {d.modePaiementPrefere && ` · ${modePaiementLabels[d.modePaiementPrefere]}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {d.statut === "ENVOYE" && (
                      <>
                        <Button variant="outline" onClick={() => setDeclining(d)}>
                          <X aria-hidden />
                          Decline
                        </Button>
                        <Button onClick={() => setAccepting(d)}>
                          <Check aria-hidden />
                          Accept
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" asChild className="ml-auto">
                      <a href={pdfHref(d.id)} download>
                        <Download aria-hidden />
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Receipt className="size-5 text-primary" aria-hidden />
          My invoices
        </h2>
        {factures.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices"
            description="Your invoices are issued as soon as you accept a quote."
          />
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {factures.map((f) => {
                const reste = f.montantTTC - f.montantPaye;
                return (
                  <li key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{f.numero}</span>
                        <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-border">
                          {factureTypeLabel(f)}
                        </span>
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
                            reste > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
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
                    <Button size="sm" variant="outline" asChild>
                      <a href={pdfHref(f.devis.id, f.id)} download>
                        <Download aria-hidden />
                        PDF
                      </a>
                    </Button>
                    <div className="w-full sm:basis-full">
                      <ClientPaiementActions
                        facture={f}
                        passerelles={passerelles}
                        tauxEur={tauxEur}
                        modePrefere={devis.find((d) => d.id === f.devis.id)?.modePaiementPrefere}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <AcceptDialog devis={accepting} onClose={() => setAccepting(null)} />
      <ConfirmDialog
        open={!!declining}
        onOpenChange={(open) => !open && setDeclining(null)}
        tone="destructive"
        title="Decline this quote?"
        description="The studio will be notified. You can ask for a new quote."
        confirmLabel="Decline quote"
        pending={pending}
        onConfirm={decline}
      />
    </div>
  );
}

/** Accepting = choosing how to pay; the invoices are issued immediately after. */
function AcceptDialog({ devis, onClose }: { devis: Devis | null; onClose: () => void }) {
  return (
    <Dialog open={!!devis} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {devis && <AcceptForm key={devis.id} devis={devis} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AcceptForm({ devis, onClose }: { devis: Devis; onClose: () => void }) {
  const router = useRouter();
  const taux = devis.tauxAcompte ?? 0;
  const [plan, setPlan] = useState<PlanPaiement>(taux > 0 ? "ACOMPTE_SOLDE" : "COMPLET");
  const [mode, setMode] = useState<ModePaiement>("VIREMENT");
  const [pending, start] = useTransition();
  const acompte = Math.round(devis.montantTTC * taux * 10) / 1000;

  const plans: { value: PlanPaiement; title: string; detail: string }[] = [
    { value: "COMPLET", title: planPaiementLabels.COMPLET, detail: `One invoice of ${formatCurrency(devis.montantTTC)}, due within 7 days.` },
  ];
  if (taux > 0) {
    plans.unshift({
      value: "ACOMPTE_SOLDE",
      title: `${taux}% deposit, balance later`,
      detail: `${formatCurrency(acompte)} within 7 days, then ${formatCurrency(devis.montantTTC - acompte)} by the session date.`,
    });
  }

  const submit = () =>
    start(async () => {
      const result = await answerDevisAction(devis.id, { accept: true, planPaiement: plan, modePaiement: mode });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Quote accepted", { description: "Your invoices are ready below." });
      onClose();
      router.refresh();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Accept quote {devis.numero}</DialogTitle>
        <DialogDescription>
          {devis.seance.titre} · {formatCurrency(devis.montantTTC)} incl. VAT. Choose how you want to pay.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">Payment plan</legend>
          <RadioGroup value={plan} onValueChange={(v) => setPlan(v as PlanPaiement)} className="gap-2">
            {plans.map((p) => (
              <Label
                key={p.value}
                htmlFor={`plan-${p.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal",
                  plan === p.value && "border-primary bg-muted/40",
                )}
              >
                <RadioGroupItem id={`plan-${p.value}`} value={p.value} className="mt-0.5" />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">{p.title}</span>
                  <span className="block text-xs text-muted-foreground">{p.detail}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">Payment method</legend>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ModePaiement)}
            className="grid grid-cols-2 gap-2"
          >
            {MODES_PAIEMENT.map((m) => (
              <Label
                key={m}
                htmlFor={`mode-${m}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-normal",
                  mode === m && "border-primary bg-muted/40",
                )}
              >
                <RadioGroupItem id={`mode-${m}`} value={m} />
                {modePaiementLabels[m]}
              </Label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {mode === "CARTE"
              ? "You will pay online by card or e-Dinar right after accepting, from your invoices."
              : "After paying, send the proof from your invoices; the studio confirms it once the money is received."}
          </p>
        </fieldset>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          Accept and get my invoices
        </Button>
      </DialogFooter>
    </>
  );
}
