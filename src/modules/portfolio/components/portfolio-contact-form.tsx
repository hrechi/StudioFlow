"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES_PORTFOLIO, categoriePortfolioLabels } from "../portfolio.types";

export function PortfolioContactForm({ portfolioId }: { portfolioId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");
    setMessage("");
    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact-portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          nomVisiteur: data.get("nomVisiteur"),
          email: data.get("email"),
          telephone: data.get("telephone") || undefined,
          typeSeance: data.get("typeSeance"),
          dateSouhaitee: data.get("dateSouhaitee") || undefined,
          message: data.get("message"),
          honeypot: data.get("website"),
        }),
      });
      if (response.ok) {
        form.reset();
        setState("sent");
        setMessage("Your message has been sent. The photographer will get back to you.");
        return;
      }
      const result = (await response.json()) as { message?: string };
      setState("error");
      setMessage(result.message ?? "Could not send your message. Please try again later.");
    } catch {
      setState("error");
      setMessage("Could not send your message. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm"><span>Name</span><input name="nomVisiteur" required maxLength={120} autoComplete="name" className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm"><span>Email</span><input name="email" type="email" required maxLength={320} autoComplete="email" className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm"><span>Phone (optional)</span><input name="telephone" type="tel" maxLength={40} autoComplete="tel" className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm"><span>Session type</span><select name="typeSeance" required className="h-11 rounded-lg border border-border bg-background px-3">{CATEGORIES_PORTFOLIO.map((category) => <option key={category} value={category}>{categoriePortfolioLabels[category]}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span>Preferred date (optional)</span><input name="dateSouhaitee" type="date" className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span>Message</span><textarea name="message" required maxLength={3000} rows={5} className="rounded-lg border border-border bg-background px-3 py-2" /></label>
      <label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" disabled={state === "sending"} className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2">{state === "sending" ? "Sending…" : "Send inquiry"}</button>
      {message && <p role="status" aria-live="polite" className={state === "error" ? "text-sm text-destructive sm:col-span-2" : "text-sm text-success-text sm:col-span-2"}>{message}</p>}
    </form>
  );
}
