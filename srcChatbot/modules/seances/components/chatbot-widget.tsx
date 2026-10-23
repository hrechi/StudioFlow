"use client";

import { Loader2, MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string; packs?: { id: string; nom: string }[] };

const SUGGESTIONS = ["What packs do you offer for weddings?", "I have a budget of 800 TND", "Compare your packs"];

/** Floating assistant of the public site. It only talks to /api/chat (read-only, grounded in real packs). */
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
        body: JSON.stringify({ messages: next.slice(-10).map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await res.json()) as { reply?: string; packs?: Msg["packs"]; error?: string };
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
        { role: "assistant", content: "Connection problem. Please try again in a moment." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          aria-label="Studio assistant"
          className="flex h-[32rem] max-h-[80dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-border sm:w-96"
        >
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <AIBadge />
              <h2 className="text-sm font-semibold">ReFrame assistant</h2>
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

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-slate">
                  Hello! I can explain our packs, compare them and help you choose. Prices come
                  directly from the studio&apos;s current offers.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full bg-ai-soft px-3 py-1 text-xs text-ai-text ring-1 ring-ai/25 hover:bg-ai-soft/70"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                      : "max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.packs && m.packs.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.packs.map((p) => (
                        <Button key={p.id} asChild size="sm" variant="outline">
                          <Link href={`${bookHref}?pack=${p.id}`}>Request “{p.nom}”</Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {pending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Thinking…
              </p>
            )}
            <div ref={endRef} />
          </div>

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
              placeholder="Ask about our packs…"
              className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
              <Send aria-hidden />
            </Button>
          </form>
          <p className="px-4 pb-2 text-[0.65rem] text-muted-foreground">
            AI assistant: the studio confirms every booking request.
          </p>
        </section>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={() => setOpen(true)}
          className="rounded-full shadow-lg"
          aria-label="Open the studio assistant"
        >
          <MessageCircle aria-hidden /> Ask the studio
        </Button>
      )}
    </div>
  );
}
