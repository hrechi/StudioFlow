"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Menu, X, Sun, Moon } from "lucide-react";
import { usePortfolioTheme } from "./PortfolioThemeWrapper";

export type PortfolioNavItem = { href: string; label: string };
type PortfolioTopBarProps = {
  photographerName: string;
  location?: string;
  hasHero?: boolean;
  sections?: PortfolioNavItem[];
};

export function PortfolioThemeToggle({
  className = "",
  transparent = false,
}: {
  className?: string;
  transparent?: boolean;
}) {
  const { mode, toggleMode } = usePortfolioTheme();

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex size-9 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{
        borderColor: transparent ? "rgba(255,255,255,0.3)" : "var(--portfolio-border)",
        backgroundColor: transparent
          ? "rgba(0,0,0,0.3)"
          : "color-mix(in srgb, var(--portfolio-surface) 80%, transparent)",
        color: transparent ? "#fff" : "var(--portfolio-text)",
      }}
    >
      {mode === "dark" ? (
        <Sun className="size-4 text-[#e8a34a] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-[#1a120c] transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}

export function PortfolioTopBar({
  photographerName,
  location = "",
  hasHero = false,
  sections = [],
}: PortfolioTopBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, toggleMode } = usePortfolioTheme();
  const transparent = hasHero && !scrolled && !menuOpen;
  const reservationTarget =
    sections.find((section) => section.href === "#contact")?.href ??
    sections.find((section) => section.href === "#portfolio")?.href;

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <header
      className="portfolio-topbar-enter sticky top-0 z-50 flex h-[54px] w-full items-center justify-between border-b px-4 backdrop-blur-md transition-colors duration-500 sm:px-6"
      style={{
        borderColor: transparent ? "transparent" : "var(--portfolio-border)",
        backgroundColor: transparent
          ? "transparent"
          : scrolled
            ? "color-mix(in srgb, var(--portfolio-bg) 92%, transparent)"
            : "var(--portfolio-bg)",
      }}
    >
      <div className="flex items-center gap-4">
        <Link
          href="/portfolio"
          className="group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            borderColor: transparent ? "rgba(255,255,255,0.3)" : "var(--portfolio-border)",
            backgroundColor: transparent
              ? "rgba(0,0,0,0.3)"
              : "color-mix(in srgb, var(--portfolio-surface) 80%, transparent)",
            color: transparent ? "#fff" : "var(--portfolio-text)",
          }}
          aria-label="Back to portfolio directory"
          title="Back to portfolios"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden font-mono text-[9px] uppercase tracking-wider sm:inline">
            Portfolios
          </span>
        </Link>
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex flex-col leading-none">
            <span
              className="font-sans text-[10px] font-semibold tracking-[0.22em] uppercase sm:text-[11px]"
              style={{ color: transparent ? "#fff" : "var(--portfolio-text)" }}
            >
              {photographerName.toUpperCase()}
            </span>
            <span
              className="mt-1 hidden font-mono text-[7px] tracking-[0.32em] uppercase sm:inline-block"
              style={{ color: transparent ? "rgba(255,255,255,0.68)" : "var(--portfolio-muted)" }}
            >
              Studio{location ? ` · ${location}` : ""}
            </span>
          </div>
        </Link>
      </div>

      <nav aria-label="Portfolio navigation" className="hidden items-center gap-7 min-[1200px]:flex">
        {sections.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="portfolio-nav-link relative py-2 font-mono text-[9px] tracking-[0.12em] uppercase"
            style={{ color: transparent ? "rgba(255,255,255,0.82)" : "var(--portfolio-muted)" }}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <PortfolioThemeToggle transparent={transparent} />

        {reservationTarget && (
          <a
            href={reservationTarget}
            className="hidden rounded-full px-4 py-2 font-sans text-[11px] font-semibold transition-colors hover:brightness-110 min-[760px]:inline-flex"
            style={{ backgroundColor: "var(--portfolio-accent)", color: "var(--portfolio-bg)" }}
          >
            Book Session
          </a>
        )}
        {sections.length > 0 && (
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="portfolio-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-full border min-[1200px]:hidden"
            style={{
              color: transparent ? "#fff" : "var(--portfolio-text)",
              borderColor: transparent ? "rgba(255,255,255,0.3)" : "var(--portfolio-border)",
            }}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        )}
      </div>

      {menuOpen && (
        <nav
          id="portfolio-mobile-menu"
          aria-label="Portfolio mobile navigation"
          className="absolute inset-x-0 top-full flex flex-col gap-1 border-b p-3 backdrop-blur-xl min-[1200px]:hidden"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "color-mix(in srgb, var(--portfolio-bg) 96%, transparent)",
          }}
        >
          {sections.map((section) => (
            <a
              key={section.href}
              href={section.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 font-mono text-[10px] tracking-[0.12em] uppercase"
              style={{ color: "var(--portfolio-text)" }}
            >
              {section.label}
            </a>
          ))}

          {/* Option Mode Sombre / Mode Clair dans le menu mobile */}
          <div
            className="mt-2 flex items-center justify-between border-t pt-2.5 px-2"
            style={{ borderColor: "var(--portfolio-border)" }}
          >
            <span
              className="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: "var(--portfolio-muted)" }}
            >
              Theme
            </span>
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] uppercase transition-colors"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
                color: "var(--portfolio-text)",
              }}
            >
              {mode === "dark" ? (
                <>
                  <Sun className="size-3 text-[#e8a34a]" />
                  <span>Dark mode</span>
                </>
              ) : (
                <>
                  <Moon className="size-3" />
                  <span>Light mode</span>
                </>
              )}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
