"use client";

import { Ban, CheckCircle2, Hand, Inbox, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import {
  categorieReclamationLabels,
  prioriteConfig,
  statutReclamationConfig,
  type Priorite,
  type Reclamation,
  type StatutReclamation,
} from "../avis.types";

const PRIORITY_ORDER: Record<Priorite, number> = { URGENTE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 };

/** /dashboard/reclamations — complaints table + detail drawer (take charge / answer / resolve / reject). */
export function ReclamationsBoard({ reclamations }: { reclamations: Reclamation[] }) {
  const [statut, setStatut] = useState<StatutReclamation | typeof ALL>(ALL);
  const [priorite, setPriorite] = useState<Priorite | typeof ALL>(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");

  const list = useMemo(
    () =>
      reclamations
        .filter((r) => statut === ALL || r.statut === statut)
        .filter((r) => priorite === ALL || r.priorite === priorite)
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priorite] - PRIORITY_ORDER[b.priorite] ||
            b.dateCreation.localeCompare(a.dateCreation),
        ),
    [reclamations, statut, priorite],
  );
  const current = reclamations.find((r) => r.id === openId) ?? null;
  const closed = current && (current.statut === "RESOLUE" || current.statut === "REJETEE");

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutReclamationConfig)}
          allLabel="All statuses"
          label="Filter by status"
        />
        <FilterSelect
          value={priorite}
          onChange={setPriorite}
          options={labelsOf(prioriteConfig)}
          allLabel="All priorities"
          label="Filter by priority"
        />
        <p className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-ai" aria-hidden />
          Category and priority suggested by the AI
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No complaints"
          description="Nothing to handle for these filters."
          className="m-4"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Complaints</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Complaint</th>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">AI category</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Received</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(r.id);
                        setReponse(r.reponse ?? "");
                      }}
                      className="text-left font-semibold text-foreground hover:text-primary-text hover:underline"
                    >
                      {r.objet}
                    </button>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                      {r.seance.titre}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate">{fullName(r.client)}</td>
                  <td className="px-4 py-3 text-slate">
                    {categorieReclamationLabels[r.categorie]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-xs font-semibold text-ai-text ring-1 ring-ai/20",
                        r.categorieIA !== r.categorie && "ring-ai",
                      )}
                    >
                      <Sparkles className="size-3" aria-hidden />
                      {categorieReclamationLabels[r.categorieIA]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.priorite} config={prioriteConfig} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.statut} config={statutReclamationConfig} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatRelative(r.dateCreation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!current} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {current && (
            <>
              <SheetHeader className="border-b">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={current.statut} config={statutReclamationConfig} />
                  <StatusBadge value={current.priorite} config={prioriteConfig} />
                </div>
                <SheetTitle className="text-lg">{current.objet}</SheetTitle>
                <SheetDescription>
                  {current.seance.titre} · received {formatDateTime(current.dateCreation)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="flex items-center gap-3">
                  <UserAvatar {...current.client} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {fullName(current.client)}
                    </p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
                <p className="rounded-lg bg-surface p-4 text-sm leading-relaxed text-slate">
                  {current.description}
                </p>

                <div className="rounded-lg bg-ai-soft p-3 text-sm ring-1 ring-ai/20">
                  <p className="flex items-center gap-1.5 font-semibold text-ai-text">
                    <Sparkles className="size-4" aria-hidden />
                    AI analysis
                  </p>
                  <p className="mt-1 text-slate">
                    Detected category:{" "}
                    <strong>{categorieReclamationLabels[current.categorieIA]}</strong>
                    {current.categorieIA !== current.categorie &&
                      ` (the client chose "${categorieReclamationLabels[current.categorie]}")`}
                    . Suggested priority:{" "}
                    <strong>{prioriteConfig[current.priorite].label.toLowerCase()}</strong>.
                  </p>
                </div>

                {current.traitePar && (
                  <p className="text-sm text-muted-foreground">
                    Handled by{" "}
                    <span className="font-medium text-slate">{fullName(current.traitePar)}</span>
                  </p>
                )}

                <div className="space-y-2">
                  <label htmlFor="reponse-reclamation" className="text-sm font-medium text-slate">
                    Reply to the client
                  </label>
                  <Textarea
                    id="reponse-reclamation"
                    rows={4}
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    disabled={!!closed}
                    placeholder="Explain the solution offered to the client…"
                    className="bg-card"
                  />
                </div>

                {!closed && (
                  <div className="grid grid-cols-2 gap-2">
                    {current.statut === "OUVERTE" && (
                      <Button
                        variant="outline"
                        className="col-span-2"
                        onClick={() => comingSoon("Take charge of the complaint")}
                      >
                        <Hand aria-hidden />
                        Take charge
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="col-span-2"
                      disabled={!reponse.trim()}
                      onClick={() => comingSoon("Send the reply to the client")}
                    >
                      <Send aria-hidden />
                      Send reply
                    </Button>
                    <Button
                      onClick={() => comingSoon("Mark as resolved")}
                      disabled={!reponse.trim()}
                    >
                      <CheckCircle2 aria-hidden />
                      Resolve
                    </Button>
                    <Button
                      variant="destructive-soft"
                      onClick={() => comingSoon("Reject the complaint")}
                    >
                      <Ban aria-hidden />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
