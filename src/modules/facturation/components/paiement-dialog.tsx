"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { recordPaiementAction } from "../facturation.actions";
import { MODES_PAIEMENT, modePaiementLabels, type Facture, type ModePaiement } from "../facturation.types";

/** Cahier: Facture.enregistrerPaiement(montant) — full or partial payment. */
export function PaiementDialog({
  devisId,
  facture,
  defaultMode,
  onOpenChange,
}: {
  devisId: string;
  facture: Facture | null;
  /** The method the client chose when accepting the quote. */
  defaultMode?: ModePaiement;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!facture} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {facture && (
          <PaiementForm
            key={facture.id}
            devisId={devisId}
            facture={facture}
            defaultMode={defaultMode}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaiementForm({
  devisId,
  facture,
  defaultMode,
  onDone,
}: {
  devisId: string;
  facture: Facture;
  defaultMode?: ModePaiement;
  onDone: () => void;
}) {
  const router = useRouter();
  const reste = Math.round((facture.montantTTC - facture.montantPaye) * 1000) / 1000;
  const [montant, setMontant] = useState(reste);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<ModePaiement>(defaultMode ?? facture.modePaiement ?? "VIREMENT");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setErrors({});
      const result = await recordPaiementAction(devisId, facture.id, {
        montant,
        date,
        modePaiement: mode,
        reference: reference.trim() || undefined,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(montant >= reste ? "Invoice fully paid" : "Partial payment recorded");
      onDone();
      router.refresh();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Payment received</DialogTitle>
        <DialogDescription>
          {facture.numero} · remaining {formatCurrency(reste)}. Confirm what the client paid (all or part).
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField id="montant" label="Amount (TND)" required error={errors.montant?.[0]}>
            <Input
              id="montant"
              type="number"
              min={0.001}
              max={reste}
              step="0.001"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value) || 0)}
              className="h-10 bg-card"
            />
          </FormField>
          <FormField id="date-paiement" label="Date" required error={errors.date?.[0]}>
            <Input
              id="date-paiement"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 bg-card"
            />
          </FormField>
        </div>
        <FormField id="mode" label="Payment method" required>
          <Select value={mode} onValueChange={(value) => setMode(value as ModePaiement)}>
            <SelectTrigger id="mode" className="h-10 w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES_PAIEMENT.map((m) => (
                <SelectItem key={m} value={m}>
                  {modePaiementLabels[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="reference" label="Reference" error={errors.reference?.[0]}>
          <Input
            id="reference"
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Cheque or transfer number…"
            className="h-10 bg-card"
          />
        </FormField>
        <DialogFooter>
          <Button type="submit" disabled={pending || montant <= 0}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
