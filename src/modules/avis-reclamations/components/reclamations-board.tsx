"use client";

import {
  Ban,
  CheckCircle2,
  Hand,
  Inbox,
  RotateCcw,
  ScrollText,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import {
  categorieReclamationLabels,
  prioriteConfig,
  statutReclamationConfig,
  type Priorite,
  type Reclamation,
  type ResumeReclamation,
  type StatutReclamation,
} from "../avis.types";
import {
  generateFeedbackReplyAction,
  summarizeReclamationAction,
  updateReclamationAction,
} from "../avis.actions";
import { ReclamationThread } from "./reclamation-thread";

const PRIORITY_ORDER: Record<Priorite, number> = { URGENTE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 };

/** /dashboard/reclamations — complaints table + detail drawer (take charge / chat with the client / resolve / reject). */
export function ReclamationsBoard({ reclamations }: { reclamations: Reclamation[] }) {
  const [items, setItems] = useState(reclamations);
  const [statut, setStatut] = useState<StatutReclamation | typeof ALL>(ALL);
  const [priorite, setPriorite] = useState<Priorite | typeof ALL>(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [isPending, startTransition] = useTransition();

  const list = useMemo(
    () =>
      items
        .filter((r) => statut === ALL || r.statut === statut)
        .filter((r) => priorite === ALL || r.priorite === priorite)
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priorite] - PRIORITY_ORDER[b.priorite] ||
            b.dateCreation.localeCompare(a.dateCreation),
        ),
    [items, statut, priorite],
  );
  const current = items.find((r) => r.id === openId) ?? null;

  const changeStatut = (id: string, next: StatutReclamation, done: string) =>
    startTransition(async () => {
      const result = await updateReclamationAction({ id, statut: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, statut: next } : item)));
      toast.success(done);
    });
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
                        setReponse("");
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
                    <span className="inline-flex items-center gap-1.5">
                      <StatusBadge value={r.priorite} config={prioriteConfig} />
                      {r.escaladeIA && r.statut !== "RESOLUE" && r.statut !== "REJETEE" && (
                        <TriangleAlert
                          className="size-4 text-ai"
                          aria-label="AI: client frustration rising"
                        />
                      )}
                    </span>
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
                  {current.escaladeIA && (
                    <p className="mt-2 flex items-center gap-1.5 font-medium text-ai-text">
                      <TriangleAlert className="size-4" aria-hidden />
                      Frustration rising — flagged {formatRelative(current.escaladeIA)}
                    </p>
                  )}
                </div>

                <ThreadSummary
                  reclamation={current}
                  onSummary={(resumeIA) =>
                    setItems((prev) =>
                      prev.map((item) => (item.id === current.id ? { ...item, resumeIA } : item)),
                    )
                  }
                />

                {(current.traitePar || current.satisfaction || current.nombreReouvertures > 0) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {current.traitePar && (
                      <p>
                        Handled by{" "}
                        <span className="font-medium text-slate">
                          {fullName(current.traitePar)}
                        </span>
                      </p>
                    )}
                    {current.satisfaction && (
                      <p className="flex items-center gap-1">
                        {current.satisfaction.satisfait ? (
                          <ThumbsUp className="size-4 text-success" aria-hidden />
                        ) : (
                          <ThumbsDown className="size-4 text-destructive" aria-hidden />
                        )}
                        Client {current.satisfaction.satisfait ? "satisfied" : "not satisfied"}
                      </p>
                    )}
                    {current.nombreReouvertures > 0 && (
                      <p className="flex items-center gap-1">
                        <RotateCcw className="size-4" aria-hidden />
                        Reopened {current.nombreReouvertures}×
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate">Conversation with the client</p>
                    {!closed && (
                      <Button
                        variant="ai-soft"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await generateFeedbackReplyAction({
                              id: current.id,
                              kind: "reclamation",
                            });
                            if (!result.ok) {
                              toast.error(result.error);
                              return;
                            }
                            setReponse(result.data.draft);
                            toast.info("AI draft ready — review it before sending");
                          })
                        }
                      >
                        <Sparkles aria-hidden />
                        Generate reply
                      </Button>
                    )}
                  </div>
                  <ReclamationThread
                    reclamation={current}
                    viewer="staff"
                    draft={reponse}
                    onDraftChange={setReponse}
                    onSent={(message) =>
                      setItems((prev) =>
                        prev.map((item) =>
                          item.id === current.id
                            ? {
                                ...item,
                                messages: [...item.messages, message],
                                reponse: message.contenu,
                                statut: item.statut === "OUVERTE" ? "EN_COURS" : item.statut,
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>

                {!closed && (
                  <div className="grid grid-cols-2 gap-2">
                    {current.statut === "OUVERTE" && (
                      <Button
                        variant="outline"
                        className="col-span-2"
                        disabled={isPending}
                        onClick={() =>
                          changeStatut(current.id, "EN_COURS", "Complaint taken in charge")
                        }
                      >
                        <Hand aria-hidden />
                        Take charge
                      </Button>
                    )}
                    <Button
                      disabled={isPending}
                      onClick={() => changeStatut(current.id, "RESOLUE", "Complaint resolved")}
                    >
                      <CheckCircle2 aria-hidden />
                      Resolve
                    </Button>
                    <Button
                      variant="destructive-soft"
                      disabled={isPending}
                      onClick={() => changeStatut(current.id, "REJETEE", "Complaint rejected")}
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

/** "Summarize" — AI digest (asked / promised / still open), cached until the thread grows. */
function ThreadSummary({
  reclamation: r,
  onSummary,
}: {
  reclamation: Reclamation;
  onSummary: (resume: ResumeReclamation) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const resume = r.resumeIA;
  const stale = !!resume && resume.nbMessages < r.messages.length;

  const summarize = () =>
    startTransition(async () => {
      const result = await summarizeReclamationAction({ id: r.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSummary(result.data);
    });

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate">
          <ScrollText className="size-4" aria-hidden />
          Thread summary
        </p>
        {(!resume || stale) && (
          <Button variant="ai-soft" size="sm" disabled={isPending} onClick={summarize}>
            <Sparkles aria-hidden />
            {resume ? "Refresh" : "Summarize"}
          </Button>
        )}
      </div>
      {resume ? (
        <dl className={cn("grid gap-1.5 text-sm", stale && "opacity-60")}>
          {(
            [
              ["Asked", resume.demande],
              ["Promised", resume.engagements],
              ["Still open", resume.enSuspens],
            ] as const
          ).map(([label, text]) => (
            <div key={label} className="grid grid-cols-[5.5rem_1fr] gap-2">
              <dt className="font-medium text-foreground">{label}</dt>
              <dd className="text-slate">{text}</dd>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {stale ? "New messages since this summary · " : ""}Generated{" "}
            {formatRelative(resume.dateGeneration)}
          </p>
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          What was asked, what was promised and what is still open — in three lines.
        </p>
      )}
    </div>
  );
}
