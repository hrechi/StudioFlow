"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CATEGORIES_PORTFOLIO,
  categoriePortfolioLabelsEn,
  type CategoriePortfolio,
} from "../portfolio.types";

export function PortfolioContactForm({
  portfolioId,
  categories = [...CATEGORIES_PORTFOLIO],
}: {
  portfolioId: string;
  categories?: CategoriePortfolio[];
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [packageName, setPackageName] = useState("");

  useEffect(() => {
    const handlePackageInquiry = (event: Event) => {
      const detail = (event as CustomEvent<{ packageName?: string }>).detail;
      if (!detail?.packageName) return;
      setPackageName(detail.packageName);
      setMessageDraft(
        `Hello, I would like to get more information about the "${detail.packageName}" package.`,
      );
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("portfolio:package-inquiry", handlePackageInquiry);
    return () => window.removeEventListener("portfolio:package-inquiry", handlePackageInquiry);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");
    setMessage("");
    const data = new FormData(form);
    const rawDate = String(data.get("dateSouhaitee") || "");
    const dateSouhaitee = toIsoDate(rawDate);
    if (rawDate && !dateSouhaitee) {
      setState("error");
      setMessage("Please enter a valid date in DD/MM/YYYY format.");
      return;
    }
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
          dateSouhaitee: dateSouhaitee || undefined,
          lieu: data.get("lieu") || undefined,
          budget: data.get("budget") || undefined,
          forfaitDemande: packageName || undefined,
          message: data.get("message"),
          honeypot: data.get("website"),
        }),
      });
      if (response.ok) {
        form.reset();
        setMessageDraft("");
        setPackageName("");
        setState("sent");
        setMessage("Your message has been sent. The photographer will get back to you shortly.");
        return;
      }
      const result = (await response.json()) as { message?: string };
      setState("error");
      setMessage(result.message ?? "Failed to send message. Please try again later.");
    } catch {
      setState("error");
      setMessage("Failed to send message. Please check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submit} lang="en" className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {[
        {
          name: "nomVisiteur",
          label: "Full Name",
          type: "text",
          required: true,
          maxLength: 120,
          autoComplete: "name",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          required: true,
          maxLength: 320,
          autoComplete: "email",
        },
        {
          name: "telephone",
          label: "Phone (optional)",
          type: "tel",
          required: false,
          maxLength: 40,
          autoComplete: "tel",
        },
      ].map((field) => (
        <label key={field.name} className="grid gap-1.5 text-xs font-medium">
          <span style={{ color: "var(--portfolio-text)" }}>{field.label}</span>
          <input
            name={field.name}
            type={field.type}
            required={field.required}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete}
            className="h-11 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
            style={{
              backgroundColor: "var(--portfolio-bg)",
              borderColor: "var(--portfolio-border)",
              color: "var(--portfolio-text)",
              caretColor: "var(--portfolio-accent)",
              "--tw-ring-color": "var(--portfolio-accent)",
            } as React.CSSProperties}
          />
        </label>
      ))}
      <label className="grid gap-1.5 text-xs font-medium">
        <span style={{ color: "var(--portfolio-text)" }}>Session Type</span>
        <select
          name="typeSeance"
          required
          className="h-11 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
          style={{
            backgroundColor: "var(--portfolio-bg)",
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-text)",
            accentColor: "var(--portfolio-accent)",
          }}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {categoriePortfolioLabelsEn[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">
        <span style={{ color: "var(--portfolio-text)" }}>Preferred Date (DD/MM/YYYY, optional)</span>
        <input
          name="dateSouhaitee"
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/([0-9]{4})"
          title="Please enter a date in DD/MM/YYYY format"
          maxLength={10}
          className="h-11 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
          style={{
            backgroundColor: "var(--portfolio-bg)",
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-text)",
            accentColor: "var(--portfolio-accent)",
          }}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium">
        <span style={{ color: "var(--portfolio-text)" }}>Location / Venue</span>
        <input
          name="lieu"
          type="text"
          maxLength={160}
          autoComplete="address-level2"
          className="h-11 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
          style={{
            backgroundColor: "var(--portfolio-bg)",
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-text)",
            caretColor: "var(--portfolio-accent)",
            "--tw-ring-color": "var(--portfolio-accent)",
          } as React.CSSProperties}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium">
        <span style={{ color: "var(--portfolio-text)" }}>Estimated Budget (optional)</span>
        <input
          name="budget"
          type="text"
          maxLength={80}
          placeholder="e.g. $800 - $1,500"
          className="h-11 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
          style={{
            backgroundColor: "var(--portfolio-bg)",
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-text)",
            caretColor: "var(--portfolio-accent)",
            "--tw-ring-color": "var(--portfolio-accent)",
          } as React.CSSProperties}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">
        <span style={{ color: "var(--portfolio-text)" }}>Your Message</span>
        <textarea
          name="message"
          required
          maxLength={500}
          rows={4}
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          className="resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:ring-2"
          style={{
            backgroundColor: "var(--portfolio-bg)",
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-text)",
            caretColor: "var(--portfolio-accent)",
            "--tw-ring-color": "var(--portfolio-accent)",
          } as React.CSSProperties}
        />
      </label>
      <label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        Website<input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        className="h-12 rounded-full px-5 font-semibold transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
        style={{
          backgroundColor: "var(--portfolio-accent)",
          color: "var(--portfolio-bg)",
        }}
      >
        {state === "sending" ? "Sending..." : "Send Message"}
      </button>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm sm:col-span-2 ${state === "error" ? "text-destructive" : "text-success-text"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}

function toIsoDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) return "";
  return `${year}-${month}-${day}`;
}
