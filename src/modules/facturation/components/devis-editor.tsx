"use client";

import { Loader2, Plus, Save, Send, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AIBadge } from "@/components/shared/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  createDevisAction,
  sendDevisAction,
  suggestDevisAction,
  updateDevisAction,
} from "../facturation.actions";
import type { SeanceFacturable } from "../facturation.integrations";
import {
  calculerTotaux,
  TAUX_ACOMPTE_PAR_DEFAUT,
  TVA_PAR_DEFAUT,
  VALIDITE_DEVIS_JOURS,
  type Devis,
  type LignePrestation,
} from "../facturation.types";

/** `auto`: filled from the session and not edited since, so switching session may replace it. */
type Ligne = LignePrestation & { key: number; ia?: boolean; auto?: boolean };

const fromSeance = (seance: SeanceFacturable | undefined): Ligne[] =>
  seance?.lignes.length
    ? seance.lignes.map((l, i) => ({ ...l, key: Date.now() + i, auto: true }))
    : [{ key: Date.now(), designation: "", quantite: 1, prixUnitaire: 0 }];

const toDateInput = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

/** /dashboard/facturation/devis/nouveau and /[id]/modifier — lines, discount, VAT, deposit, "Generate with AI". */
export function DevisEditor({
  seances,
  devis,
  defaultSeanceId,
}: {
  seances: SeanceFacturable[];
  /** Edit mode when set (draft quotes only). */
  devis?: Devis;
  defaultSeanceId?: string;
}) {
  const router = useRouter();
  const initialSeanceId =
    devis?.seance.id ??
    (seances.some((s) => s.id === defaultSeanceId) ? defaultSeanceId! : (seances[0]?.id ?? ""));
  const [lignes, setLignes] = useState<Ligne[]>(() =>
    devis
      ? devis.prestations.map((p, i) => ({ ...p, key: i + 1 }))
      : fromSeance(seances.find((s) => s.id === initialSeanceId)),
  );
  const [remise, setRemise] = useState(devis?.remise ?? 0);
  const [tva, setTva] = useState(devis?.tva ?? TVA_PAR_DEFAUT);
  const [tauxAcompte, setTauxAcompte] = useState(devis?.tauxAcompte ?? TAUX_ACOMPTE_PAR_DEFAUT);
  const [dateValidite, setDateValidite] = useState(() =>
    toDateInput(devis?.dateValidite ?? new Date(Date.now() + VALIDITE_DEVIS_JOURS * 86_400_000)),
  );
  const [commentaire, setCommentaire] = useState(devis?.commentaire ?? "");
  const [seanceId, setSeanceId] = useState(initialSeanceId);
  const [genereParIA, setGenereParIA] = useState(devis?.genereParIA ?? false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, startSaving] = useTransition();
  const [generating, startGenerating] = useTransition();

  const seance = seances.find((s) => s.id === seanceId);
  const totaux = calculerTotaux(lignes, remise, tva);
  const acompte = (totaux.montantTTC * tauxAcompte) / 100;

  if (seances.length === 0 && !devis) {
    return (
      <EmptyState
        icon={Send}
        title="No session to quote"
        description="Quotes are created for confirmed sessions with a client account. Confirm a session first."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/seances">Go to sessions</Link>
          </Button>
        }
      />
    );
  }

  const update = (key: number, patch: Partial<LignePrestation>) =>
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch, ia: false, auto: false } : l)));
  const addLine = () =>
    setLignes((prev) => [...prev, { key: Date.now(), designation: "", quantite: 1, prixUnitaire: 0 }]);
  const removeLine = (key: number) =>
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  /** Pre-fills from the new session unless the admin already typed their own lines. */
  const chooseSeance = (id: string) => {
    setSeanceId(id);
    const untouched = lignes.every((l) => l.auto || (!l.designation.trim() && l.prixUnitaire === 0));
    if (untouched) {
      setLignes(fromSeance(seances.find((s) => s.id === id)));
      setGenereParIA(false);
      setAiSource(null);
    }
  };

  const generate = () =>
    startGenerating(async () => {
      const result = await suggestDevisAction(seanceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLignes(result.data.lignes.map((l, i) => ({ ...l, key: Date.now() + i, ia: true })));
      setGenereParIA(true);
      setAiSource(result.data.source);
      toast.success("Quote pre-filled by the AI", {
        description: "Check the services and prices before sending.",
      });
    });

  const save = (andSend: boolean) =>
    startSaving(async () => {
      if (!seance && !devis) return;
      setFieldErrors({});
      const payload = {
        client: seance?.client.id ?? devis!.client.id,
        seance: seanceId,
        lignes: lignes.map(({ designation, quantite, prixUnitaire }) => ({
          designation,
          quantite,
          prixUnitaireHT: Math.round(prixUnitaire * 1000),
        })),
        remise,
        tva,
        devise: "TND" as const,
        tauxAcompte,
        dateEmission: devis?.dateEmission ?? new Date().toISOString(),
        dateValidite: new Date(`${dateValidite}T23:59:59`).toISOString(),
        commentaire: commentaire.trim() || undefined,
        genereParIA,
      };
      const result = devis
        ? await updateDevisAction(devis.id, payload)
        : await createDevisAction(payload);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      if (andSend) {
        const sent = await sendDevisAction(result.data.id);
        if (!sent.ok) {
          toast.error(`Saved as draft, but not sent: ${sent.error}`);
          router.push(`/dashboard/facturation/devis/${result.data.id}`);
          return;
        }
      }
      toast.success(andSend ? "Quote sent to the client portal" : "Draft saved");
      router.push(`/dashboard/facturation/devis/${result.data.id}`);
    });

  const firstError = (prefix: string) =>
    Object.entries(fieldErrors).find(([key]) => key.startsWith(prefix))?.[1]?.[0];

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={(e) => {
        e.preventDefault();
        save(true);
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client and session</CardTitle>
            <CardDescription>Only confirmed sessions with a client account can be quoted.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="seance" label="Session" required error={firstError("seance")}>
              <Select value={seanceId} onValueChange={chooseSeance}>
                <SelectTrigger id="seance" className="h-10 w-full bg-card">
                  <SelectValue placeholder={devis?.seance.titre ?? "Choose a session"} />
                </SelectTrigger>
                <SelectContent>
                  {seances.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.titre} · {formatDate(s.dateDebut)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="client" label="Client" error={firstError("client")}>
              <Input
                id="client"
                readOnly
                value={seance?.client.nom ?? (devis ? `${devis.client.prenom} ${devis.client.nom}` : "")}
                className="h-10 bg-muted/40"
              />
            </FormField>
            {seance && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {seance.typeEvenement}
                {seance.pack && ` · pack ${seance.pack.nom} (${formatCurrency(seance.pack.prix)})`}
                {seance.prixFinal !== undefined && ` · agreed price ${formatCurrency(seance.prixFinal)}`}
              </p>
            )}
            {devis && !seance && (
              <p className="text-sm text-destructive-text sm:col-span-2">
                The session of this quote is no longer confirmed: pick another session to save it.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Services</CardTitle>
              <CardDescription>
                {aiSource ??
                  (lignes.some((l) => l.auto)
                    ? "Filled from the session's pack and price. Unit prices excluding VAT."
                    : "Unit prices excluding VAT.")}
              </CardDescription>
            </div>
            <Button type="button" variant="ai" onClick={generate} disabled={generating || !seance}>
              {generating ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
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
                    aria-invalid={!!fieldErrors[`lignes.${index}.designation`]}
                    className="h-9 bg-card pr-12"
                  />
                  {ligne.ia && <AIBadge className="absolute top-1/2 right-2 -translate-y-1/2" />}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={ligne.quantite}
                  onChange={(e) =>
                    update(ligne.key, { quantite: Math.max(1, Math.floor(Number(e.target.value)) || 1) })
                  }
                  aria-label={`Quantity line ${index + 1}`}
                  className="h-9 bg-card"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.001"
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
            {firstError("lignes") && (
              <p className="text-sm text-destructive-text">{firstError("lignes")}</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus aria-hidden />
              Add a line
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note for the client</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Payment terms, what is included…"
              aria-label="Note for the client"
              className="bg-card"
            />
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
                  onChange={(e) => setRemise(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
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
              <FormField id="acompte" label="Deposit (%)">
                <Input
                  id="acompte"
                  type="number"
                  min={0}
                  max={100}
                  value={tauxAcompte}
                  onChange={(e) =>
                    setTauxAcompte(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="h-9 bg-card"
                />
              </FormField>
              <FormField id="validite" label="Valid until" error={firstError("dateValidite")}>
                <Input
                  id="validite"
                  type="date"
                  min={toDateInput(new Date())}
                  value={dateValidite}
                  onChange={(e) => setDateValidite(e.target.value)}
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Deposit {tauxAcompte}%</dt>
                <dd>{formatCurrency(acompte)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <div className="grid gap-2">
          <Button type="submit" disabled={saving || !seance}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Save and send to client
          </Button>
          <Button type="button" variant="outline" disabled={saving || !seance} onClick={() => save(false)}>
            <Save aria-hidden />
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={devis ? `/dashboard/facturation/devis/${devis.id}` : "/dashboard/facturation/devis"}>
              Cancel
            </Link>
          </Button>
        </div>
      </aside>
    </form>
  );
}
