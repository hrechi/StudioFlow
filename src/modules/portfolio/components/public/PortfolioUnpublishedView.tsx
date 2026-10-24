"use client";

import Link from "next/link";
import { ArrowRight, EyeOff } from "lucide-react";
import { PortfolioTopBar } from "./PortfolioTopBar";

type PortfolioUnpublishedViewProps = {
  photographerName?: string;
  isDraft?: boolean;
};

export function PortfolioUnpublishedView({
  photographerName = "Photographe",
  isDraft = true,
}: PortfolioUnpublishedViewProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0f0905] text-[#f3ebdd]">
      {/* Sticky Top Bar (54px) */}
      <PortfolioTopBar photographerName={photographerName} />

      {/* Amber diffuse top halo */}
      <div
        className="pointer-events-none absolute top-[54px] left-1/2 h-[340px] w-full max-w-3xl -translate-x-1/2 opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle at 50% 0%, #e8a34a 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Main centered waiting state */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        {/* 52px circular badge with amber slashed eye */}
        <div className="flex size-[52px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] shadow-inner">
          <EyeOff className="size-5 text-[#e8a34a]" aria-hidden="true" />
        </div>

        {/* Kicker monospace */}
        <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8a34a]">
          Portfolio unavailable
        </p>

        {/* Tight clamp title */}
        <h1 className="mt-3 font-sans text-[clamp(26px,4.5vw,44px)] font-bold tracking-tight text-[#f3ebdd] leading-[1.08]">
          This page is not published
        </h1>

        {/* Paragraph max 52ch */}
        <p className="mt-4 max-w-[52ch] font-sans text-sm text-[#9a8f82] leading-relaxed">
          {isDraft
            ? "Le photographe y travaille encore, ou l'a retiré pour un temps — le brouillon reste privé."
            : "Aucun portfolio n'a été trouvé à cette adresse."}
        </p>

        {/* Two actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {/* Amber solid button with arrow */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#e8a34a] px-5 py-2.5 font-sans text-xs font-semibold text-[#0f0905] shadow-md transition-all hover:bg-[#d69238] hover:shadow-lg active:scale-95"
          >
            <span>Back to StudioFlow</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>

          {/* Ghost button to open editor */}
          <Link
            href="/dashboard/portfolio"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-sans text-xs font-medium text-[#f3ebdd] transition-all hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10 hover:text-[#e8a34a] active:scale-95"
          >
            <span>Open the editor</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

