"use client";

import Link from "next/link";
import { Pencil, User } from "lucide-react";

type PortfolioTopBarProps = {
  photographerName: string;
};

export function PortfolioTopBar({ photographerName }: PortfolioTopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-[54px] w-full items-center justify-between border-b border-white/[0.08] bg-[#0f0905]/94 px-4 backdrop-blur-md sm:px-6">
      {/* Left: StudioFlow logo */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-3.5 animate-ping rounded-full bg-[#e8a34a] opacity-30" />
            <span className="relative inline-flex size-2 rounded-full bg-[#e8a34a] ring-4 ring-[#e8a34a]/20" />
          </span>
          <span className="font-sans text-sm font-semibold tracking-tight text-[#f3ebdd]">
            StudioFlow
          </span>
        </Link>

        {/* Center: Photographer badge (hidden < 760px) */}
        <div className="hidden items-center gap-1.5 font-sans text-[11.5px] text-[#9a8f82] min-[760px]:flex">
          <User className="size-3.5 text-[#9a8f82]/70" aria-hidden="true" />
          <span>{photographerName}</span>
        </div>
      </div>

      {/* Right: Edit this page button */}
      <Link
        href="/dashboard/portfolio"
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-sans text-[11.5px] font-medium text-[#f3ebdd] transition-all hover:border-[#e8a34a] hover:bg-[#e8a34a]/10 hover:text-[#e8a34a]"
      >
        <Pencil className="size-3 text-[#e8a34a]" aria-hidden="true" />
        <span>Edit this page</span>
      </Link>
    </header>
  );
}

