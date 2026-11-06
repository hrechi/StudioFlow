"use client";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Formulaire de création — 3 modes : CHAMPS, LIBRE, UPLOAD.
 */
import { FileText, LayoutTemplate, Type, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { creerContratAction, creerContratUploadAction } from "../contrat.actions";
import type { ModeCreation } from "../contrat.types";

type ClientOption = { id: string; prenom: string; nom: string; email: string };

const MODES: { value: ModeCreation; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: "CHAMPS",
    label: "Structured fields",
    description: "Fill in a form — PDF auto-generated.",
    icon: LayoutTemplate,
  },
  {
    value: "LIBRE",
    label: "Free text",
    description: "Type the contract terms freely.",
    icon: Type,
  },
  {
    value: "UPLOAD",
    label: "Upload PDF",
    description: "Upload a ready-made PDF contract.",
    icon: Upload,
  },
];

export function ContratForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ModeCreation>("CHAMPS");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function fieldError(key: string) {
    return fieldErrors[key]?.[0];
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const fd = new FormData(form);
    const titre = (fd.get("titre") as string)?.trim();
    const clientId = fd.get("clientId") as string;

    startTransition(async () => {
      if (mode === "UPLOAD") {
        fd.set("titre", titre);
        fd.set("clientId", clientId);
        const res = await creerContratUploadAction(fd);
        if (!res.ok) { setError(res.error); return; }
        router.push(`/dashboard/contrats/${res.data!.id}`);
        return;
      }

      const input =
        mode === "CHAMPS"
          ? {
              modeCreation: "CHAMPS" as const,
              titre,
              clientId,
              champs: {
                nomClient: fd.get("nomClient") as string,
                emailClient: fd.get("emailClient") as string,
                dateSeance: (fd.get("dateSeance") as string) || undefined,
                lieuSeance: (fd.get("lieuSeance") as string) || undefined,
                prestations: fd.get("prestations") as string,
                montantTTC: fd.get("montantTTC") ? Number(fd.get("montantTTC")) : undefined,
                conditionsAnnulation: (fd.get("conditionsAnnulation") as string) || undefined,
                delaiLivraison: (fd.get("delaiLivraison") as string) || undefined,
                clausesSupplementaires: (fd.get("clausesSupplementaires") as string) || undefined,
              },
            }
          : {
              modeCreation: "LIBRE" as const,
              titre,
              clientId,
              texteLibre: fd.get("texteLibre") as string,
            };

      const res = await creerContratAction(input);
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors as Record<string, string[]>);
        return;
      }
      router.push(`/dashboard/contrats/${res.data!.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode selector */}
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Contract type</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                mode === value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card hover:border-primary/40",
              )}
            >
              <Icon className={cn("size-5", mode === value ? "text-primary-text" : "text-muted-foreground")} aria-hidden />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Common fields */}
      <Card>
        <CardHeader><CardTitle>General information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titre">Title</Label>
            <Input id="titre" name="titre" placeholder="Ex: Photography contract – Sarra Ben Ali" required maxLength={200} />
            {fieldError("titre") && <p className="text-xs text-destructive-text">{fieldError("titre")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <select
              id="clientId"
              name="clientId"
              required
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom} — {c.email}
                </option>
              ))}
            </select>
            {fieldError("clientId") && <p className="text-xs text-destructive-text">{fieldError("clientId")}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Mode CHAMPS */}
      {mode === "CHAMPS" && (
        <Card>
          <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nomClient">Client name (on contract)</Label>
                <Input id="nomClient" name="nomClient" placeholder="Full name" required maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailClient">Client email</Label>
                <Input id="emailClient" name="emailClient" type="email" required maxLength={200} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dateSeance">Session date <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="dateSeance" name="dateSeance" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lieuSeance">Location <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="lieuSeance" name="lieuSeance" placeholder="Studio A, outdoor…" maxLength={300} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prestations">Services & deliverables</Label>
              <Textarea id="prestations" name="prestations" rows={4} required maxLength={2000}
                placeholder="2h shooting, 30 edited photos, delivery within 14 days…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="montantTTC">Amount incl. VAT (TND) <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="montantTTC" name="montantTTC" type="number" min={0} step={0.001} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delaiLivraison">Delivery timeline <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="delaiLivraison" name="delaiLivraison" placeholder="14 days after session" maxLength={500} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditionsAnnulation">Cancellation terms <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="conditionsAnnulation" name="conditionsAnnulation" rows={2} maxLength={1000}
                placeholder="Free cancellation up to 7 days before the session…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clausesSupplementaires">Additional clauses <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="clausesSupplementaires" name="clausesSupplementaires" rows={3} maxLength={3000} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode LIBRE */}
      {mode === "LIBRE" && (
        <Card>
          <CardHeader><CardTitle>Contract text</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              id="texteLibre"
              name="texteLibre"
              rows={16}
              required
              minLength={10}
              maxLength={20000}
              placeholder="Type the full contract text here…"
              className="font-mono text-sm"
            />
            {fieldError("texteLibre") && <p className="mt-1 text-xs text-destructive-text">{fieldError("texteLibre")}</p>}
          </CardContent>
        </Card>
      )}

      {/* Mode UPLOAD */}
      {mode === "UPLOAD" && (
        <Card>
          <CardHeader><CardTitle>PDF file</CardTitle></CardHeader>
          <CardContent>
            <label
              htmlFor="fichier"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <FileText className="size-10 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Click to select a PDF</p>
                <p className="text-xs text-muted-foreground">Max 10 MB · PDF only</p>
              </div>
              <input
                id="fichier"
                name="fichier"
                type="file"
                accept="application/pdf"
                required
                className="sr-only"
                ref={fileRef}
                onChange={(e) => {
                  const name = e.target.files?.[0]?.name;
                  const label = e.currentTarget.closest("label");
                  const p = label?.querySelector("p");
                  if (p && name) p.textContent = name;
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive-text">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create contract"}
        </Button>
      </div>
    </form>
  );
}
