"use client";

/**
 * Module : Chatbot IA · Responsable : Yosser Rafrafi
 * Widget flottant du site vitrine. Il ne parle qu'à /api/chat (lecture seule, basé sur les vrais packs).
 */

import { Clock, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { Button } from "@/components/ui/button";
import { CHATBOT_NAME } from "../chatbot/chatbot.config";
import type { ChatPackCard } from "../chatbot/chatbot.config";

type Msg = {
  role: "user" | "assistant";
  content: string;
  packs?: ChatPackCard[];
};

const SUGGESTIONS = [
  "Which packs do you offer for a wedding?",
  "My budget is 800 TND",
  "Compare your packs",
];

function formatPrix(prix: number | null): string {
  if (prix === null) return "Price on request";
  return `${(prix / 1000).toLocaleString("en-US", { minimumFractionDigits: 0 })} TND`;
}

function formatDuree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function Avatar({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-ai text-ai-foreground text-xs font-bold ${className ?? ""}`}
      aria-hidden
    >
      <Sparkles className="size-3.5" />
    </div>
  );
}

function PackCard({ pack, bookHref }: { pack: ChatPackCard; bookHref: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm space-y-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {pack.miseEnAvant && (
            <span className="inline-block mb-1 rounded-full bg-ai-soft px-2 py-0.5 text-[0.65rem] font-semibold text-ai-text">
              Featured
            </span>
          )}
          <p className="font-semibold text-sm text-foreground leading-tight">{pack.nom}</p>
          <p className="text-muted-foreground">{pack.typeEvenement}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground">{formatPrix(pack.prix)}</p>
          {pack.dureeMinutes && (
            <p className="text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="size-3" aria-hidden />
              {formatDuree(pack.dureeMinutes)}
            </p>
          )}
        </div>
      </div>
      {pack.prestations.length > 0 && (
        <ul className="space-y-0.5 text-muted-foreground">
          {pack.prestations.slice(0, 4).map((p, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-ai-text mt-0.5">•</span>
              <span>
                {p.libelle}
                {p.conditions && <span className="text-[0.65rem] opacity-70"> ({p.conditions})</span>}
              </span>
            </li>
          ))}
          {pack.prestations.length > 4 && (
            <li className="text-[0.65rem] opacity-60">+{pack.prestations.length - 4} more…</li>
          )}
        </ul>
      )}
      <Button asChild size="sm" className="w-full h-8 text-xs">
        <Link href={`${bookHref}?pack=${pack.id}`}>
          Request this pack →
        </Link>
      </Button>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="The assistant is thinking…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatbotWidget({ bookHref }: { bookHref: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-10).map(({ role, content: c }) => ({ role, content: c })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        packs?: ChatPackCard[];
        error?: string;
      };
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong. Please try again.",
          packs: data.packs,
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Connection problem. Please try again in a moment.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          aria-label={`Assistant ${CHATBOT_NAME}`}
          className="flex h-[36rem] max-h-[85dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border sm:w-[26rem]"
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar className="size-7" />
              <div>
                <h2 className="text-sm font-semibold leading-none">{CHATBOT_NAME}</h2>
                <p className="text-[0.65rem] text-muted-foreground leading-none mt-0.5">
                  <AIBadge />
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
          </header>

          {/* Messages */}
          <div
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
            aria-live="polite"
            aria-label="Conversation history"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Avatar className="size-6 shrink-0 mt-0.5" />
                  <p className="text-foreground bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                    Hello! I&apos;m {CHATBOT_NAME}. I can explain our packs, compare them and help you choose.
                    Prices come straight from the studio&apos;s current offers.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pl-8" role="list" aria-label="Suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="listitem"
                      onClick={() => send(s)}
                      className="rounded-full bg-ai-soft px-3 py-1 text-xs text-ai-text ring-1 ring-ai/25 hover:bg-ai-soft/70 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start items-start gap-2"}
              >
                {m.role === "assistant" && <Avatar className="size-6 shrink-0 mt-0.5" />}
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                      : "max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.packs && m.packs.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {m.packs.map((p) => (
                        <PackCard key={p.id} pack={p} bookHref={bookHref} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex items-start gap-2">
                <Avatar className="size-6 shrink-0 mt-0.5" />
                <div className="rounded-2xl rounded-bl-sm bg-muted">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={endRef} aria-hidden />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <label htmlFor="chat-input" className="sr-only">
              Your message
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask a question about our packs…"
              className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending || !input.trim()}
              aria-label="Send"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send aria-hidden />}
            </Button>
          </form>

          <p className="px-4 pb-2 text-[0.65rem] text-muted-foreground">
            {CHATBOT_NAME} · AI · The studio approves every booking request.
          </p>
        </section>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={() => setOpen(true)}
          className="rounded-full shadow-lg"
          aria-label={`Open the ${CHATBOT_NAME} assistant`}
        >
          <MessageCircle aria-hidden />
          Ask us
        </Button>
      )}
    </div>
  );
}
