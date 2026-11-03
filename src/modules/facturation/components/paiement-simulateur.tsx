"use client";

import { CreditCard, FlaskConical, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { simulatePaiementAction } from "../facturation.actions";

/** Development checkout: lets you test the online flow end to end without a gateway account. */
export function PaiementSimulateur({
  paiement,
}: {
  paiement: { ref: string; numero: string; montant: number; statut: string; seance: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const done = paiement.statut !== "EN_ATTENTE";

  const run = (reussi: boolean) =>
    start(async () => {
      const result = await simulatePaiementAction(paiement.ref, reussi);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const retour = result.data.statut === "PAYE" ? "success" : "failed";
      router.push(`/espace-client/factures?paiement=${retour}`);
    });

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-warning-text uppercase">
            <FlaskConical className="size-3.5" aria-hidden />
            Test mode — no real payment
          </p>
          <CardTitle>Pay invoice {paiement.numero}</CardTitle>
          <CardDescription>
            {paiement.seance}. Set KONNECT_API_KEY and KONNECT_WALLET_ID to use the real Konnect checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-baseline justify-between border-y py-4">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(paiement.montant)}</span>
          </div>
          {done ? (
            <Button asChild className="w-full">
              <Link href="/espace-client/factures">This checkout is closed — back to my invoices</Link>
            </Button>
          ) : (
            <div className="grid gap-2">
              <Button onClick={() => run(true)} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
                Simulate a successful payment
              </Button>
              <Button variant="outline" onClick={() => run(false)} disabled={pending}>
                <X aria-hidden />
                Simulate a failed payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
