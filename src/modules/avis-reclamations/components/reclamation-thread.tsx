"use client";

import { Lock, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime } from "@/lib/utils";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import { sendReclamationMessageAction } from "../avis.actions";
import type { Reclamation, ReclamationMessage } from "../avis.types";

const ROLE_LABELS: Record<Role, string> = {
  CLIENT: "Client",
  ADMIN: "Studio",
  PHOTOGRAPHE: "Photographer",
};

/**
 * Chat bubbles between the client and the studio (admin / photographer) under a complaint.
 * The viewer's own side is on the right; the complaint description opens the thread.
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
          const mine = (m.auteurRole === "CLIENT") === (viewer === "client");
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
                <time
                  dateTime={m.dateEnvoi}
                  className="mt-0.5 text-[0.65rem] text-muted-foreground"
                >
                  {formatDateTime(m.dateEnvoi)}
                </time>
              </div>
            </li>
          );
        })}
        <li ref={endRef} aria-hidden />
      </ol>

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
