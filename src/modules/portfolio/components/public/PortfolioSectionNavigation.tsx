"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { PortfolioNavItem } from "./PortfolioTopBar";

export function PortfolioSectionNavigation({
  items,
  hasHero = false,
}: {
  items: PortfolioNavItem[];
  hasHero?: boolean;
}) {
  const [visible, setVisible] = useState(!hasHero);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-portfolio-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.02 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!items.length) return null;

  return (
    <>
      <nav
        aria-label="Portfolio sections"
        className={`sticky top-0 z-40 border-y backdrop-blur-xl transition-[opacity,transform] duration-300 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{
          borderColor: "var(--portfolio-border)",
          backgroundColor: "color-mix(in srgb, var(--portfolio-bg) 94%, transparent)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4 sm:px-6">
          <Link
            href="/portfolio"
            aria-label="Back to photographer directory"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold transition hover:border-[var(--portfolio-accent)] hover:text-[var(--portfolio-accent)]"
            style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-muted)" }}
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Portfolios</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 py-4 font-mono text-[9px] tracking-[0.12em] uppercase transition-colors hover:text-[var(--portfolio-accent)]"
                style={{ color: "var(--portfolio-muted)" }}
              >
                {item.label}
              </a>
            ))}
          </div>
          <a
            href="#contact"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[11px] font-semibold transition hover:brightness-110"
            style={{ backgroundColor: "var(--portfolio-accent)", color: "var(--portfolio-bg)" }}
          >
            Contact <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </nav>
      <a
        href="#contact"
        className="fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full px-5 text-xs font-semibold shadow-xl min-[760px]:hidden"
        style={{
          backgroundColor: "var(--portfolio-accent)",
          color: "var(--portfolio-bg)",
          boxShadow: "0 10px 32px color-mix(in srgb, var(--portfolio-accent) 24%, transparent)",
        }}
      >
        Request a Quote <ArrowUpRight className="size-4" />
      </a>
    </>
  );
}
