"use client";

import { CheckCircle2, Clock, CreditCard, FileUp, Loader2, Upload } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { startPaiementEnLigneAction } from "../facturation.actions";
import {
  MODES_HORS_LIGNE,
  MODES_PREUVE_OBLIGATOIRE,
  modePaiementLabels,
  PREUVE_TAILLE_MAX,
  PREUVE_TYPES,
  type FactureAvecContexte,
  type ModePaiement,
} from "../facturation.types";

type ModeHorsLigne = (typeof MODES_HORS_LIGNE)[number];
export type Passerelle = "KONNECT" | "STRIPE" | "SIMULATION";

const PASSERELLES: Record<Passerelle, { titre: string; detail: (tnd: number, eur: number) => string }> = {
  KONNECT: { titre: "Konnect", detail: (tnd) => `Tunisian bank card, e-Dinar or Konnect wallet · ${tnd.toFixed(3)} TND` },
  STRIPE: { titre: "Stripe (test mode)", detail: (_tnd, eur) => `International card · charged ≈ ${eur.toFixed(2)} EUR` },
  SIMULATION: { titre: "Test checkout", detail: (tnd) => `No real money · ${tnd.toFixed(3)} TND` },
};

const INSTRUCTIONS: Record<ModeHorsLigne, string> = {
  VIREMENT: "Upload the transfer receipt (screenshot or PDF from your bank) and its reference.",
  CHEQUE: "Upload a photo of the cheque and write its number.",
  ESPECES: "Paid at the studio desk? Add the receipt you were given if you have one.",
};

/** What the client can do on one invoice: pay online, send a proof, or follow its review. */
export function ClientPaiementActions({
  facture,
  passerelles,
  tauxEur,
  modePrefere,
}: {
  facture: FactureAvecContexte;
  passerelles: Passerelle[];
  tauxEur: number;
  modePrefere?: ModePaiement;
}) {
  const router = useRouter();
  const [declaring, setDeclaring] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [paying, start] = useTransition();
  const reste = Math.round((facture.montantTTC - facture.montantPaye) * 1000) / 1000;
  const declarations = facture.declarations ?? [];
  const enRevue = declarations.filter((d) => d.statut === "EN_ATTENTE");
  const dernierRejet = [...declarations].reverse().find((d) => d.statut === "REJETEE");
  const aPayer = Math.round((reste - enRevue.reduce((s, d) => s + d.montant, 0)) * 1000) / 1000;

  if (reste <= 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-success-text">
        <CheckCircle2 className="size-4" aria-hidden />
        Paid{facture.datePaiement && ` on ${formatDate(facture.datePaiement)}`}
      </p>
    );
  }

  const payOnline = (passerelle: Passerelle) =>
    start(async () => {
      const result = await startPaiementEnLigneAction(facture.devis.id, facture.id, passerelle);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.assign(result.data.url);
    });

  return (
    <div className="space-y-2">
      {enRevue.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warning-text">
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {formatCurrency(enRevue.reduce((s, d) => s + d.montant, 0))} declared — the studio is checking your proof.
        </p>
      )}
      {dernierRejet && enRevue.length === 0 && (
        <p className="text-xs text-destructive-text">Proof rejected: {dernierRejet.motifRejet}</p>
      )}
      {aPayer > 0 && (
        <div className="flex flex-wrap gap-2">
          {passerelles.length > 0 && (
            <Button
              size="sm"
              onClick={() => (passerelles.length === 1 ? payOnline(passerelles[0]) : setChoosing(true))}
              disabled={paying}
              variant={modePrefere && modePrefere !== "CARTE" ? "outline" : "default"}
            >
              {paying ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
              Pay {formatCurrency(aPayer)} online
            </Button>
          )}
          <Button size="sm" variant={modePrefere && modePrefere !== "CARTE" ? "default" : "outline"} onClick={() => setDeclaring(true)}>
            <FileUp aria-hidden />
            I paid by transfer, cheque or cash
          </Button>
        </div>
      )}
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay {formatCurrency(aPayer)} online</DialogTitle>
            <DialogDescription>{facture.numero} · choose how you want to pay.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {passerelles.map((p) => (
              <button
                key={p}
                type="button"
                disabled={paying}
                onClick={() => payOnline(p)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
              >
                <CreditCard className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{PASSERELLES[p].titre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {PASSERELLES[p].detail(aPayer, Math.max(0.5, Math.round(aPayer * tauxEur * 100) / 100))}
                  </span>
                </span>
                {paying && <Loader2 className="size-4 animate-spin" aria-hidden />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={declaring} onOpenChange={setDeclaring}>
        <DialogContent className="sm:max-w-lg">
          {declaring && (
            <DeclarationForm
              facture={facture}
              max={aPayer}
              defaultMode={modePrefere && modePrefere !== "CARTE" ? (modePrefere as ModeHorsLigne) : "VIREMENT"}
              onDone={() => {
                setDeclaring(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeclarationForm({
  facture,
  max,
  defaultMode,
  onDone,
}: {
  facture: FactureAvecContexte;
  max: number;
  defaultMode: ModeHorsLigne;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<ModeHorsLigne>(defaultMode);
  const [montant, setMontant] = useState(max);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const preuveObligatoire = MODES_PREUVE_OBLIGATOIRE.includes(mode);

  const submit = () =>
    start(async () => {
      setErrors({});
      if (file && file.size > PREUVE_TAILLE_MAX) {
        setErrors({ preuve: ["The proof must be 5 MB or less."] });
        return;
      }
      const form = new FormData();
      form.set("devisId", facture.devis.id);
      form.set("factureId", facture.id);
      form.set("montant", String(montant));
      form.set("date", date);
      form.set("modePaiement", mode);
      if (reference.trim()) form.set("reference", reference.trim());
      if (commentaire.trim()) form.set("commentaire", commentaire.trim());
      if (file) form.set("preuve", file);
      let result: ActionResult;
      try {
        const response = await fetch("/api/facturation/paiements/declaration", { method: "POST", body: form });
        result = (await response.json()) as ActionResult;
      } catch {
        toast.error("Upload failed: check your connection and try again.");
        return;
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Proof sent", { description: "You will be notified as soon as the studio confirms your payment." });
      onDone();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send your payment proof</DialogTitle>
        <DialogDescription>
          {facture.numero} · up to {formatCurrency(max)}. The studio checks it against what it received, then
          confirms your payment.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">How did you pay?</legend>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ModeHorsLigne)} className="grid grid-cols-3 gap-2">
            {MODES_HORS_LIGNE.map((m) => (
              <Label
                key={m}
                htmlFor={`decl-${m}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm font-normal",
                  mode === m && "border-primary bg-muted/40",
                )}
              >
                <RadioGroupItem id={`decl-${m}`} value={m} />
                {modePaiementLabels[m]}
              </Label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">{INSTRUCTIONS[mode]}</p>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="decl-montant" label="Amount paid (TND)" required error={errors.montant?.[0]}>
            <Input
              id="decl-montant"
              type="number"
              min={0.001}
              max={max}
              step="0.001"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value) || 0)}
              className="h-10 bg-card"
            />
          </FormField>
          <FormField id="decl-date" label="Payment date" required error={errors.date?.[0]}>
            <Input
              id="decl-date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 bg-card"
            />
          </FormField>
        </div>
        <FormField
          id="decl-reference"
          label={mode === "CHEQUE" ? "Cheque number" : mode === "VIREMENT" ? "Transfer reference" : "Receipt number"}
          required={preuveObligatoire}
          error={errors.reference?.[0]}
        >
          <Input
            id="decl-reference"
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
            className="h-10 bg-card"
          />
        </FormField>
        <FormField
          id="decl-preuve"
          label="Proof (JPG, PNG, WEBP or PDF, 5 MB max)"
          required={preuveObligatoire}
          error={errors.preuve?.[0]}
        >
          <label
            htmlFor="decl-preuve"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-slate hover:bg-muted/40"
          >
            <Upload className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "Choose a file…"}</span>
            <input
              id="decl-preuve"
              type="file"
              accept={PREUVE_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </FormField>
        <FormField id="decl-commentaire" label="Message to the studio" error={errors.commentaire?.[0]}>
          <Textarea
            id="decl-commentaire"
            rows={2}
            maxLength={500}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="bg-card"
          />
        </FormField>
        <DialogFooter>
          <Button type="submit" disabled={pending || montant <= 0 || (preuveObligatoire && (!file || !reference.trim()))}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
            Send proof
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
