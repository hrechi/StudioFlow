"use client";

import { useState } from "react";
import { depublierPortfolio } from "../portfolio.actions";
import type { PortfolioEditorData } from "../portfolio.service";

export function PortfolioAdminReview({ portfolio }: { portfolio: PortfolioEditorData }) {
  const [message, setMessage] = useState("");
  async function unpublish() {
    const result = await depublierPortfolio({ portfolioId: portfolio.id });
    setMessage(result.ok ? "Portfolio unpublished." : result.error);
  }
  return <section className="rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Moderation</h2><p className="mt-2 text-sm text-muted-foreground">Admins can review publication status and unpublish a portfolio. Content editing stays with its owner.</p><p className="mt-4 text-sm">Status: {portfolio.statut}</p>{portfolio.statut === "PUBLIE" && <button type="button" onClick={() => void unpublish()} className="mt-5 h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground">Unpublish portfolio</button>}{message && <p role="status" className="mt-3 text-sm">{message}</p>}</section>;
}
