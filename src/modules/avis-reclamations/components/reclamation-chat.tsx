"use client";

import {
  ArrowLeft,
  Lock,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import {
  generateFeedbackReplyAction,
  rateResolutionAction,
  reopenReclamationAction,
  sendReclamationMessageAction,
} from "../avis.actions";
import {
  REOPEN_DAYS,
  statutReclamationConfig,
  type EvenementReclamation,
  type Reclamation,
  type ReclamationMessage,
  type Sentiment,
} from "../avis.types";

/** New replies from the other side show up without a reload. */
const REFRESH_MS = 15_000;
/** Consecutive bubbles of one author closer than this share a single header. */
const GROUP_MS = 5 * 60_000;

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

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "event"; key: string; message: ReclamationMessage }
  | { kind: "bubble"; key: string; message: ReclamationMessage; first: boolean; last: boolean };

/** Day separators, centered events and bubbles grouped by author. */
function buildRows(messages: ReclamationMessage[]): Row[] {
  const rows: Row[] = [];
  let day = "";
  messages.forEach((m, i) => {
    const label = formatDate(m.dateEnvoi);
    if (label !== day) {
      day = label;
      rows.push({ kind: "day", key: `day-${m.id}`, label });
    }
    if (m.evenement) {
      rows.push({ kind: "event", key: m.id, message: m });
      return;
    }
    const sameGroup = (a?: ReclamationMessage, b?: ReclamationMessage) =>
      !!a &&
      !!b &&
      !a.evenement &&
      !b.evenement &&
      a.auteur.id === b.auteur.id &&
      formatDate(a.dateEnvoi) === formatDate(b.dateEnvoi) &&
      Math.abs(new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime()) < GROUP_MS;
    rows.push({
      kind: "bubble",
      key: m.id,
      message: m,
      first: !sameGroup(messages[i - 1], m),
      last: !sameGroup(m, messages[i + 1]),
    });
  });
  return rows;
}

/**
 * Full-height conversation of a complaint: header, scrolling thread, composer pinned at the
 * bottom. The viewer's own messages are on the right; the complaint description opens it.
 */
export function ReclamationChat({
  reclamation: r,
  viewer,
  backHref,
  headerActions,
}: {
  reclamation: Reclamation;
  viewer: "client" | "staff";
  /** Inbox link shown on small screens, where the list and the chat are separate views. */
  backHref: string;
  headerActions?: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  // Bubbles sent from here, shown until the refreshed server data includes them.
  const [sent, setSent] = useState<ReclamationMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDrafting, startDrafting] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const closed = r.statut === "RESOLUE" || r.statut === "REJETEE";

  const known = new Set(r.messages.map((m) => m.id));
  const messages: ReclamationMessage[] = [
    {
      id: `${r.id}-description`,
      auteur: r.client,
      auteurRole: "CLIENT",
      contenu: r.description,
      dateEnvoi: r.dateCreation,
    },
    ...r.messages,
    ...sent.filter((m) => !known.has(m.id)),
  ];
  const rows = buildRows(messages);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const send = () => {
    const contenu = draft.trim();
    if (!contenu || isPending) return;
    startTransition(async () => {
      const result = await sendReclamationMessageAction({ id: r.id, contenu });
      if (!result.ok) {
        toast.error(result.fieldErrors?.contenu?.[0] ?? result.error);
        return;
      }
      setDraft("");
      setSent((prev) => [...prev, result.data]);
      router.refresh();
    });
  };

  const generate = () =>
    startDrafting(async () => {
      const result = await generateFeedbackReplyAction({ id: r.id, kind: "reclamation" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data.draft);
      toast.info("AI draft ready — review it before sending");
    });

  const other = viewer === "client" ? r.traitePar : r.client;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={`Conversation: ${r.objet}`}>
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-5">
        <Link
          href={backHref}
          className="-ml-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        {other ? <UserAvatar {...other} /> : <StudioMark />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{r.objet}</p>
          <p className="truncate text-xs text-muted-foreground">
            {other ? fullName(other) : "ReFrame studio"} · {r.seance.titre}
          </p>
        </div>
        <StatusBadge value={r.statut} config={statutReclamationConfig} />
        {headerActions}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-surface/50 px-3 py-5 sm:px-6"
      >
        <ol className="mx-auto flex max-w-3xl flex-col" aria-label="Messages">
          {rows.map((row) => {
            if (row.kind === "day") {
              return (
                <li key={row.key} className="my-4 flex items-center gap-3" aria-hidden>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {row.label}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </li>
              );
            }
            if (row.kind === "event") {
              const { icon: Icon, className } = EVENT_STYLES[row.message.evenement!];
              return (
                <li key={row.key} className="my-3 flex justify-center">
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                      className,
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {row.message.contenu}
                    <time dateTime={row.message.dateEnvoi} className="font-normal opacity-70">
                      · {formatTime(row.message.dateEnvoi)}
                    </time>
                  </p>
                </li>
              );
            }
            const m = row.message;
            const mine = (m.auteurRole === "CLIENT") === (viewer === "client");
            const chip = m.sentimentIA && SENTIMENT_CHIPS[m.sentimentIA];
            return (
              <li
                key={row.key}
                className={cn(
                  "flex items-end gap-2",
                  mine && "flex-row-reverse",
                  row.first ? "mt-3" : "mt-0.5",
                )}
              >
                <div className="w-8 shrink-0">
                  {row.last && !mine && <UserAvatar {...m.auteur} size="sm" />}
                </div>
                <div
                  className={cn("flex max-w-[78%] flex-col", mine ? "items-end" : "items-start")}
                >
                  {row.first && !mine && (
                    <p className="mb-1 px-1 text-[0.7rem] text-muted-foreground">
                      <span className="font-medium text-slate">{fullName(m.auteur)}</span> ·{" "}
                      {ROLE_LABELS[m.auteurRole]}
                    </p>
                  )}
                  <p
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-xs",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground ring-1 ring-border",
                      mine && !row.last && "rounded-br-md",
                      mine && !row.first && "rounded-tr-md",
                      !mine && !row.last && "rounded-bl-md",
                      !mine && !row.first && "rounded-tl-md",
                    )}
                  >
                    {m.contenu}
                  </p>
                  {row.last && (
                    <p className="mt-1 flex items-center gap-1.5 px-1 text-[0.65rem] text-muted-foreground">
                      <time dateTime={m.dateEnvoi}>{formatTime(m.dateEnvoi)}</time>
                      {chip && (
                        <span className={cn("inline-flex items-center gap-0.5", chip.className)}>
                          <Sparkles className="size-3" aria-hidden />
                          {chip.label}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="border-t bg-card px-3 py-3 sm:px-5">
        <div className="mx-auto max-w-3xl space-y-3">
          {viewer === "client" && r.statut === "RESOLUE" && <ResolutionFeedback reclamation={r} />}
          {closed ? (
            <p className="flex items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              This complaint is closed — the conversation is read-only.
            </p>
          ) : (
            <form
              className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Textarea
                aria-label="Write a message"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                maxLength={2000}
                placeholder={viewer === "client" ? "Write to the studio…" : "Write to the client…"}
                className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              {viewer === "staff" && (
                <Button
                  type="button"
                  variant="ai-soft"
                  size="icon"
                  className="rounded-full"
                  disabled={isDrafting}
                  onClick={generate}
                  aria-label="Generate an AI reply"
                  title="Generate an AI reply"
                >
                  <Sparkles aria-hidden />
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!draft.trim() || isPending}
                aria-label="Send"
              >
                <SendHorizontal aria-hidden />
              </Button>
            </form>
          )}
          {!closed && (
            <p className="hidden text-center text-[0.65rem] text-muted-foreground sm:block">
              Enter to send · Shift + Enter for a new line
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}

/** Stand-in avatar for the studio while nobody has taken the complaint. */
export function StudioMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6rem] font-semibold tracking-[0.15em] text-background",
        className,
      )}
      aria-hidden
    >
      RF
    </span>
  );
}

/** Client card under a resolved complaint: 👍 / 👎 on the resolution, then "Reopen" if needed. */
function ResolutionFeedback({ reclamation: r }: { reclamation: Reclamation }) {
  const router = useRouter();
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
      router.refresh();
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
      router.refresh();
    });

  return (
    <div className="space-y-3 rounded-xl bg-surface p-3">
      {r.satisfaction ? (
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate">
          {r.satisfaction.satisfait ? (
            <ThumbsUp className="size-4 text-success" aria-hidden />
          ) : (
            <ThumbsDown className="size-4 text-destructive" aria-hidden />
          )}
          You rated this resolution — thank you.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="mr-1 text-sm font-medium text-foreground">Was this resolved well?</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => rate(true)}
          >
            <ThumbsUp aria-hidden />
            Yes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => rate(false)}
          >
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
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setReopening(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <RotateCcw aria-hidden />
                Reopen complaint
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-center">
            <button
              type="button"
              onClick={() => setReopening(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Not solved? Reopen it (within {REOPEN_DAYS} days of resolution)
            </button>
          </p>
        ))}
    </div>
  );
}
