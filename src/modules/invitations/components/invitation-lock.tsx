"use client";

import { ArrowRight, Check, Clock, Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { demanderDeblocageAction } from "../invitation.actions";
import { apercuTemplate, TEMPLATES } from "../invitation.templates";
import { etatAccesConfig, type AccesInvitation } from "../invitation.types";
import { InvitationApercu } from "./invitation-apercu";

const INCLUS = [
  "Cards for 11 kinds of events, from weddings to birthdays and corporate events",
  "Move, resize and rotate text, decorations, shapes and your photos, with layers",
  "Names, date and venue update the card by themselves",
  "AI writes the message in French, English or Arabic",
  "Animated link with an opening, music and a QR code to the venue",
  "Download in PDF and PNG, or share a private link",
];

const ETAPES = [
  { titre: "Accept the quote", detail: "It is ready in your quotes and invoices." },
  { titre: "Pay the invoice", detail: "Online, or by transfer, cheque or cash with a proof." },
  { titre: "Create your invitations", detail: "The editor opens as soon as the studio has your payment." },
];

/** What the client sees until the invitation invoice is paid. */
export function InvitationLock({ acces }: { acces: AccesInvitation }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const demander = () =>
    start(async () => {
      const result = await demanderDeblocageAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Your quote is ready", { description: "Accept it to get your invoice." });
      router.push("/espace-client/factures");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-6 ring-1 ring-border">
        <div aria-hidden className="grid grid-cols-3 gap-4 opacity-90">
          {TEMPLATES.slice(0, 3).map((t) => (
            <InvitationApercu key={t.id} contenu={apercuTemplate(t)} className="overflow-hidden rounded-lg shadow-soft" />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Lock className="size-4.5" aria-hidden />
          </span>
          <p className="text-sm text-slate">
            These are some of the cards you can make. The editor opens once your payment is confirmed.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">One payment, as many invitations as you need</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(acces.prixTTC)}</p>
              <p className="text-xs text-muted-foreground">incl. VAT</p>
            </div>
            <StatusBadge value={acces.etat} config={etatAccesConfig} />
          </div>

          <ul className="space-y-2 text-sm text-slate">
            {INCLUS.map((ligne) => (
              <li key={ligne} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
                {ligne}
              </li>
            ))}
          </ul>

          <ol className="space-y-3 border-t pt-4">
            {ETAPES.map((etape, i) => (
              <li key={etape.titre} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                <span>
                  <span className="block font-medium text-foreground">{etape.titre}</span>
                  <span className="block text-xs text-muted-foreground">{etape.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <ProchaineAction acces={acces} pending={pending} onDemander={demander} />
        </CardContent>
      </Card>
    </div>
  );
}

function ProchaineAction({ acces, pending, onDemander }: { acces: AccesInvitation; pending: boolean; onDemander: () => void }) {
  if (acces.etat === "VERROUILLE") {
    return (
      <Button className="w-full" onClick={onDemander} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
        Unlock the editor
      </Button>
    );
  }
  if (acces.etat === "DEVIS_A_ACCEPTER" || acces.etat === "FACTURE_A_PAYER") {
    return (
      <div className="space-y-2">
        {acces.etat === "FACTURE_A_PAYER" && acces.restant !== undefined && (
          <p className="text-sm text-slate">{formatCurrency(acces.restant)} left to pay on your invoice.</p>
        )}
        <Button asChild className="w-full">
          <Link href="/espace-client/factures">
            {acces.etat === "DEVIS_A_ACCEPTER" ? `Accept quote ${acces.devisNumero}` : "Pay my invoice"}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <p className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm text-slate">
      <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
      {acces.etat === "PREUVE_EN_VERIFICATION"
        ? "The studio is checking your proof of payment. The editor opens as soon as it is confirmed, and you will get a notification."
        : "Your invoice is being prepared by the studio. You will get a notification when it is ready."}
    </p>
  );
}
