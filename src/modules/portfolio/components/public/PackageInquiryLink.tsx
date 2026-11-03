"use client";

import { ArrowUpRight } from "lucide-react";

export function PackageInquiryLink({ packageName }: { packageName: string }) {
  return (
    <a
      href="#contact"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("portfolio:package-inquiry", { detail: { packageName } }),
        )
      }
      className="group/btn inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-sans text-xs font-medium transition-all hover:scale-105"
      style={{
        borderColor: "var(--portfolio-border)",
        backgroundColor: "var(--portfolio-bg)",
        color: "var(--portfolio-text)",
      }}
    >
      <span>Book this package</span>
      <ArrowUpRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
    </a>
  );
}
