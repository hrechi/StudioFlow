"use client";

import {
  Ban,
  CheckCircle2,
  Hand,
  RotateCcw,
  ScrollText,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import { summarizeReclamationAction, updateReclamationAction } from "../avis.actions";
import {
  categorieReclamationLabels,
  prioriteConfig,
  statutReclamationConfig,
  type Reclamation,
  type ResumeReclamation,
  type StatutReclamation,
} from "../avis.types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5 border-b px-4 py-4 last:border-0">
      <h3 className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Staff column of a conversation: who, AI signals, thread digest and status actions. */
export function ReclamationDetails({ reclamation: r }: { reclamation: Reclamation }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const closed = r.statut === "RESOLUE" || r.statut === "REJETEE";

  const changeStatut = (next: StatutReclamation, done: string) =>
    startTransition(async () => {
      const result = await updateReclamationAction({ id: r.id, statut: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      router.refresh();
    });

  return (
    <div className="text-sm">
      <Section title="Client">
        <div className="flex items-center gap-3">
          <UserAvatar {...r.client} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{fullName(r.client)}</p>
            <p className="truncate text-xs text-muted-foreground">{r.seance.titre}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Received</dt>
          <dd className="text-slate">{formatDateTime(r.dateCreation)}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd className="text-slate">{categorieReclamationLabels[r.categorie]}</dd>
          <dt className="text-muted-foreground">Handled by</dt>
          <dd className="text-slate">{r.traitePar ? fullName(r.traitePar) : "Nobody yet"}</dd>
        </dl>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={r.statut} config={statutReclamationConfig} />
          <StatusBadge value={r.priorite} config={prioriteConfig} />
        </div>
        {(r.satisfaction || r.nombreReouvertures > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {r.satisfaction && (
              <p className="flex items-center gap-1">
                {r.satisfaction.satisfait ? (
                  <ThumbsUp className="size-3.5 text-success" aria-hidden />
                ) : (
                  <ThumbsDown className="size-3.5 text-destructive" aria-hidden />
                )}
                Client {r.satisfaction.satisfait ? "satisfied" : "not satisfied"}
              </p>
            )}
            {r.nombreReouvertures > 0 && (
              <p className="flex items-center gap-1">
                <RotateCcw className="size-3.5" aria-hidden />
                Reopened {r.nombreReouvertures}×
              </p>
            )}
          </div>
        )}
        {!closed && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {r.statut === "OUVERTE" && (
              <Button
                variant="outline"
                size="sm"
                className="col-span-2"
                disabled={isPending}
                onClick={() => changeStatut("EN_COURS", "Complaint taken in charge")}
              >
                <Hand aria-hidden />
                Take charge
              </Button>
            )}
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => changeStatut("RESOLUE", "Complaint resolved")}
            >
              <CheckCircle2 aria-hidden />
              Resolve
            </Button>
            <Button
              variant="destructive-soft"
              size="sm"
              disabled={isPending}
              onClick={() => changeStatut("REJETEE", "Complaint rejected")}
            >
              <Ban aria-hidden />
              Reject
            </Button>
          </div>
        )}
      </Section>

      <Section title="AI analysis">
        <div className="space-y-2 rounded-lg bg-ai-soft p-3 ring-1 ring-ai/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-text">
            <Sparkles className="size-3.5" aria-hidden />
            Suggested by the AI
          </p>
          <p className="text-xs text-slate">
            Category <strong>{categorieReclamationLabels[r.categorieIA]}</strong>
            {r.categorieIA !== r.categorie && " (differs from the client's choice)"} · priority{" "}
            <strong>{prioriteConfig[r.priorite].label.toLowerCase()}</strong>
          </p>
          {r.escaladeIA && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-ai-text">
              <TriangleAlert className="size-3.5" aria-hidden />
              Frustration rising — flagged {formatRelative(r.escaladeIA)}
            </p>
          )}
        </div>
      </Section>

      <Section title="Thread summary">
        <ThreadSummary reclamation={r} />
      </Section>
    </div>
  );
}

/** "Summarize" — AI digest (asked / promised / still open), cached until the thread grows. */
function ThreadSummary({ reclamation: r }: { reclamation: Reclamation }) {
  const [fresh, setFresh] = useState<ResumeReclamation | null>(null);
  const [isPending, startTransition] = useTransition();
  const resume = fresh ?? r.resumeIA;
  const stale = !!resume && resume.nbMessages < r.messages.length;

  const summarize = () =>
    startTransition(async () => {
      const result = await summarizeReclamationAction({ id: r.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setFresh(result.data);
    });

  return (
    <div className="space-y-2.5">
      {resume ? (
        <dl className={cn("space-y-2 text-xs", stale && "opacity-60")}>
          {(
            [
              ["Asked", resume.demande],
              ["Promised", resume.engagements],
              ["Still open", resume.enSuspens],
            ] as const
          ).map(([label, text]) => (
            <div key={label}>
              <dt className="font-semibold text-foreground">{label}</dt>
              <dd className="text-slate">{text}</dd>
            </div>
          ))}
          <p className="text-[0.65rem] text-muted-foreground">
            {stale ? "New messages since this summary · " : ""}Generated{" "}
            {formatRelative(resume.dateGeneration)}
          </p>
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          What was asked, what was promised and what is still open — in three lines.
        </p>
      )}
      {(!resume || stale) && (
        <Button
          variant="ai-soft"
          size="sm"
          className="w-full"
          disabled={isPending}
          onClick={summarize}
        >
          {resume ? <Sparkles aria-hidden /> : <ScrollText aria-hidden />}
          {resume ? "Refresh summary" : "Summarize"}
        </Button>
      )}
    </div>
  );
}
