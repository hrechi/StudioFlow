"use client";

import {
  Lock,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime } from "@/lib/utils";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import {
  rateResolutionAction,
  reopenReclamationAction,
  sendReclamationMessageAction,
} from "../avis.actions";
import {
  REOPEN_DAYS,
  type EvenementReclamation,
  type Reclamation,
  type ReclamationMessage,
  type Sentiment,
} from "../avis.types";

const ROLE_LABELS: Record<Role, string> = {
  CLIENT: "Client",
  ADMIN: "Studio",
  PHOTOGRAPHE: "Photographer",
};

const EVENT_STYLES: Record<EvenementReclamation, { icon: LucideIcon; className: string }> = {
  REOUVERTURE: { icon: RotateCcw, className: "bg-warning/10 text-warning-text" },
  SATISFAIT: { icon: ThumbsUp, className: "bg-success/10 text-success-text" },
  INSATISFAIT: { icon: ThumbsDown, className: "bg-destructive/10 text-destructive-text" },
  ESCALADE: { icon: TriangleAlert, className: "bg-ai-soft text-ai-text ring-1 ring-ai/20" },
};

const SENTIMENT_CHIPS: Record<Sentiment, { label: string; className: string } | null> = {
  POSITIF: { label: "Positive", className: "text-success-text" },
  NEUTRE: null,
  NEGATIF: { label: "Negative", className: "text-destructive-text" },
};

/**
 * Chat bubbles between the client and the studio (admin / photographer) under a complaint.
 * The viewer's own side is on the right; the complaint description opens the thread.
 * Status events (reopened, satisfaction, AI escalation) are centered lines, not bubbles.
 */
export function ReclamationThread({
  reclamation,
  viewer,
  draft,
  onDraftChange,
  onSent,
}: {
  reclamation: Reclamation;
  viewer: "client" | "staff";
  /** Optional controlled composer (lets the staff board inject an AI draft). */
  draft?: string;
  onDraftChange?: (value: string) => void;
  onSent?: (message: ReclamationMessage) => void;
}) {
  const [ownDraft, setOwnDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLLIElement>(null);
  const value = draft ?? ownDraft;
  const setValue = onDraftChange ?? setOwnDraft;
  const closed = reclamation.statut === "RESOLUE" || reclamation.statut === "REJETEE";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [reclamation.messages.length]);

  const opening: ReclamationMessage = {
    id: `${reclamation.id}-description`,
    auteur: reclamation.client,
    auteurRole: "CLIENT",
    contenu: reclamation.description,
    dateEnvoi: reclamation.dateCreation,
  };

  const send = () =>
    startTransition(async () => {
      const result = await sendReclamationMessageAction({ id: reclamation.id, contenu: value });
      if (!result.ok) {
        toast.error(result.fieldErrors?.contenu?.[0] ?? result.error);
        return;
      }
      setValue("");
      onSent?.(result.data);
    });

  return (
    <div className="space-y-3">
      <ol
        className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-surface p-3"
        aria-label="Conversation"
      >
        {[opening, ...reclamation.messages].map((m) => {
          if (m.evenement) {
            const { icon: Icon, className } = EVENT_STYLES[m.evenement];
            return (
              <li key={m.id} className="flex justify-center">
                <p
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    className,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {m.contenu}
                  <time dateTime={m.dateEnvoi} className="font-normal opacity-70">
                    · {formatDateTime(m.dateEnvoi)}
                  </time>
                </p>
              </li>
            );
          }
          const mine = (m.auteurRole === "CLIENT") === (viewer === "client");
          const chip = m.sentimentIA && SENTIMENT_CHIPS[m.sentimentIA];
          return (
            <li key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              <UserAvatar {...m.auteur} size="sm" />
              <div className={cn("flex max-w-[80%] flex-col", mine && "items-end")}>
                <p className="mb-0.5 text-[0.7rem] text-muted-foreground">
                  {fullName(m.auteur)} · {ROLE_LABELS[m.auteurRole]}
                </p>
                <p
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-card text-slate ring-1 ring-border",
                  )}
                >
                  {m.contenu}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                  <time dateTime={m.dateEnvoi}>{formatDateTime(m.dateEnvoi)}</time>
                  {chip && (
                    <span className={cn("inline-flex items-center gap-0.5", chip.className)}>
                      <Sparkles className="size-3" aria-hidden />
                      {chip.label}
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
        <li ref={endRef} aria-hidden />
      </ol>

      {viewer === "client" && reclamation.statut === "RESOLUE" && (
        <ResolutionFeedback reclamation={reclamation} />
      )}

      {closed ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden />
          This complaint is closed — the conversation is read-only.
        </p>
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) send();
          }}
        >
          <Textarea
            aria-label="Write a message"
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && value.trim() && !isPending) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={viewer === "client" ? "Write to the studio…" : "Write to the client…"}
            className="min-h-0 flex-1 resize-none bg-card"
          />
          <Button type="submit" size="icon" disabled={!value.trim() || isPending} aria-label="Send">
            <Send aria-hidden />
          </Button>
        </form>
      )}
    </div>
  );
}

/** Client card under a resolved complaint: 👍 / 👎 on the resolution, then "Reopen" if needed. */
function ResolutionFeedback({ reclamation: r }: { reclamation: Reclamation }) {
  const [reopening, setReopening] = useState(false);
  const [raison, setRaison] = useState("");
  const [isPending, startTransition] = useTransition();

  const rate = (satisfait: boolean) =>
    startTransition(async () => {
      const result = await rateResolutionAction({ id: r.id, satisfait });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Thanks for your feedback");
      if (!satisfait && r.peutRouvrir) setReopening(true);
    });

  const reopen = () =>
    startTransition(async () => {
      const result = await reopenReclamationAction({ id: r.id, raison });
      if (!result.ok) {
        toast.error(result.fieldErrors?.raison?.[0] ?? result.error);
        return;
      }
      toast.success("Complaint reopened", { description: "The studio has been notified." });
      setReopening(false);
      setRaison("");
    });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {r.satisfaction ? (
        <p className="flex items-center gap-1.5 text-sm text-slate">
          {r.satisfaction.satisfait ? (
            <ThumbsUp className="size-4 text-success" aria-hidden />
          ) : (
            <ThumbsDown className="size-4 text-destructive" aria-hidden />
          )}
          You rated this resolution — thank you.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium text-foreground">Was this resolved well?</p>
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => rate(true)}>
            <ThumbsUp aria-hidden />
            Yes
          </Button>
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => rate(false)}>
            <ThumbsDown aria-hidden />
            No
          </Button>
        </div>
      )}

      {r.peutRouvrir &&
        (reopening ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              reopen();
            }}
          >
            <Textarea
              aria-label="What is still wrong?"
              rows={2}
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="What is still wrong? (optional)"
              className="bg-card"
              maxLength={2000}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                <RotateCcw aria-hidden />
                Reopen complaint
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setReopening(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setReopening(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text hover:underline"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Not solved? Reopen (within {REOPEN_DAYS} days of resolution)
          </button>
        ))}
    </div>
  );
}
