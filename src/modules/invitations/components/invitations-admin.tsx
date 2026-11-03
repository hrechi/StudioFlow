"use client";

import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { setPrixInvitationAction } from "../invitation.actions";
import { etatAccesConfig, type AccesClientView, type ParametresInvitationView } from "../invitation.types";

/** /dashboard/facturation/invitations: the price of the editor, and who paid for it. */
export function InvitationsAdmin({ parametres, acces }: { parametres: ParametresInvitationView; acces: AccesClientView[] }) {
  const router = useRouter();
  const [prixHT, setPrixHT] = useState(String(parametres.prixHT));
  const [tva, setTva] = useState(String(parametres.tva));
  const [erreurs, setErreurs] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const apercu = Number(prixHT) * (1 + Number(tva) / 100);

  const enregistrer = () =>
    start(async () => {
      const result = await setPrixInvitationAction({ prixHT, tva });
      setErreurs(result.ok ? {} : (result.fieldErrors ?? {}));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Price updated");
      router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Editor price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="prix-ht" label="Price excl. VAT (TND)" required error={erreurs.prixHT?.[0]}>
            <Input id="prix-ht" type="number" min="0" step="0.001" value={prixHT} onChange={(e) => setPrixHT(e.target.value)} />
          </FormField>
          <FormField id="tva" label="VAT (%)" required error={erreurs.tva?.[0]}>
            <Input id="tva" type="number" min="0" max="100" step="0.1" value={tva} onChange={(e) => setTva(e.target.value)} />
          </FormField>
          <p className="text-sm text-slate">
            The client pays <strong>{Number.isFinite(apercu) ? formatCurrency(apercu) : "—"}</strong> incl. VAT.
          </p>
          <p className="text-xs text-muted-foreground">Quotes already sent keep their price.</p>
          <Button className="w-full" onClick={enregistrer} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Save
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="py-4">
          <CardTitle>Client requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            A client is unlocked as soon as their invoice is fully paid. Confirm proofs from the quote page, like any other invoice.
          </p>
        </CardHeader>
        {acces.length === 0 ? (
          <CardContent className="pb-6">
            <EmptyState title="No requests yet" description="Clients ask for the editor from their Invitations page." />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Client</th>
                  <th scope="col" className="px-4 py-2 font-medium">Quote</th>
                  <th scope="col" className="px-4 py-2 font-medium">Access</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Remaining</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Invitations</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {acces.map((a) => (
                  <tr key={a.devisId}>
                    <td className="px-4 py-3 font-medium text-foreground">{a.client}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/facturation/devis/${a.devisId}`} className="text-primary-text underline-offset-2 hover:underline">
                        {a.devisNumero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={a.etat} config={etatAccesConfig} />
                      {a.debloqueLe && <span className="ml-2 text-xs text-muted-foreground">{formatDate(a.debloqueLe)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(a.restant)}</td>
                    <td className="px-4 py-3 text-right">{a.invitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
