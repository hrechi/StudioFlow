"use client";

import { Loader2, Plus, Save, Send, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AIBadge } from "@/components/shared/ai-badge";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatCurrency } from "@/lib/utils";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { calculerTotaux, TVA_PAR_DEFAUT, type LignePrestation } from "../facturation.types";

type Ligne = LignePrestation & { key: number; ia?: boolean };

/** /dashboard/facturation/devis/nouveau — lines, discount, excl. VAT/VAT/incl. VAT, "Generate with AI". */
export function DevisEditor({
  clients,
  seances,
  lignesIA,
}: {
  clients: UtilisateurRef[];
  seances: { id: string; titre: string }[];
  lignesIA: LignePrestation[];
}) {
  const [lignes, setLignes] = useState<Ligne[]>([
    { key: 1, designation: "", quantite: 1, prixUnitaire: 0 },
  ]);
  const [remise, setRemise] = useState(0);
  const [tva, setTva] = useState(TVA_PAR_DEFAUT);
  const [generating, startGenerating] = useTransition();
  const totaux = calculerTotaux(lignes, remise, tva);

  const update = (key: number, patch: Partial<LignePrestation>) =>
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch, ia: false } : l)));
  const addLine = () =>
    setLignes((prev) => [
      ...prev,
      { key: Date.now(), designation: "", quantite: 1, prixUnitaire: 0 },
    ]);
  const removeLine = (key: number) =>
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const generate = () =>
    startGenerating(async () => {
      await new Promise((r) => setTimeout(r, 700)); // simulates the AI call
      setLignes(lignesIA.map((l, i) => ({ ...l, key: Date.now() + i, ia: true })));
      toast.success("Quote pre-filled by the AI", {
        description: "Check the services and prices before sending.",
      });
    });

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={(e) => {
        e.preventDefault();
        comingSoon("Send the quote to the client");
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client and session</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="client" label="Client" required>
              <Select defaultValue={clients[0]?.id}>
                <SelectTrigger id="client" className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {fullName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="seance" label="Session" required>
              <Select defaultValue={seances[0]?.id}>
                <SelectTrigger id="seance" className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seances.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Services</CardTitle>
              <CardDescription>Unit prices excluding VAT.</CardDescription>
            </div>
            <Button type="button" variant="ai" onClick={generate} disabled={generating}>
              {generating ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Sparkles aria-hidden />
              )}
              Generate with AI
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.25rem] gap-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span className="text-right">Total excl. VAT</span>
              <span />
            </div>
            {lignes.map((ligne, index) => (
              <div
                key={ligne.key}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_5rem] gap-2 rounded-lg p-1 md:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.25rem] md:items-center",
                  ligne.ia && "bg-ai-soft ring-1 ring-ai/20",
                )}
              >
                <div className="relative col-span-2 md:col-span-1">
                  <Input
                    value={ligne.designation}
                    onChange={(e) => update(ligne.key, { designation: e.target.value })}
                    placeholder="e.g. Wedding coverage (8 h)"
                    aria-label={`Description of line ${index + 1}`}
                    className="h-9 bg-card pr-12"
                  />
                  {ligne.ia && <AIBadge className="absolute top-1/2 right-2 -translate-y-1/2" />}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={ligne.quantite}
                  onChange={(e) =>
                    update(ligne.key, { quantite: Math.max(1, Number(e.target.value) || 1) })
                  }
                  aria-label={`Quantity line ${index + 1}`}
                  className="h-9 bg-card"
                />
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={ligne.prixUnitaire}
                  onChange={(e) =>
                    update(ligne.key, { prixUnitaire: Math.max(0, Number(e.target.value) || 0) })
                  }
                  aria-label={`Unit price line ${index + 1}`}
                  className="h-9 bg-card"
                />
                <span className="self-center text-right text-sm font-semibold text-foreground">
                  {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLine(ligne.key)}
                  aria-label={`Delete line ${index + 1}`}
                  disabled={lignes.length === 1}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus aria-hidden />
              Add a line
            </Button>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="remise" label="Discount (%)">
                <Input
                  id="remise"
                  type="number"
                  min={0}
                  max={100}
                  value={remise}
                  onChange={(e) =>
                    setRemise(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="h-9 bg-card"
                />
              </FormField>
              <FormField id="tva" label="VAT (%)">
                <Input
                  id="tva"
                  type="number"
                  min={0}
                  max={100}
                  value={tva}
                  onChange={(e) => setTva(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="h-9 bg-card"
                />
              </FormField>
            </div>
            <dl className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-slate">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(totaux.brut)}</dd>
              </div>
              <div className="flex justify-between text-slate">
                <dt>Discount</dt>
                <dd>− {formatCurrency(totaux.montantRemise)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <dt>Total excl. VAT</dt>
                <dd>{formatCurrency(totaux.montantHT)}</dd>
              </div>
              <div className="flex justify-between text-slate">
                <dt>VAT {tva}%</dt>
                <dd>{formatCurrency(totaux.montantTVA)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold text-foreground">
                <dt>Total incl. VAT</dt>
                <dd>{formatCurrency(totaux.montantTTC)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <div className="grid gap-2">
          <Button type="submit">
            <Send aria-hidden />
            Send to client
          </Button>
          <Button type="button" variant="outline" onClick={() => comingSoon("Save the draft")}>
            <Save aria-hidden />
            Save draft
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard/facturation/devis">Cancel</Link>
          </Button>
        </div>
      </aside>
    </form>
  );
}
