"use client";

import { useEffect, useRef, useState } from "react";

type Statistic = { valeur: string; label: string };

function formatValue(value: string, progress: number): string {
  const match = /^([^0-9]*)(\d+(?:[.,]\d+)?)(.*)$/.exec(value);
  if (!match) return value;

  const [, prefix, rawNumber, suffix] = match;
  const number = Number(rawNumber.replace(",", "."));
  if (!Number.isFinite(number)) return value;
  const decimals = rawNumber.split(/[.,]/)[1]?.length ?? 0;
  const current = (number * progress).toFixed(decimals).replace(".", rawNumber.includes(",") ? "," : ".");
  return `${prefix}${current}${suffix}`;
}

export function PortfolioStatistics({ stats }: { stats: Statistic[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    let startTime: number | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setProgress(0);
        const animate = (timestamp: number) => {
          startTime ??= timestamp;
          const elapsed = Math.min((timestamp - startTime) / 900, 1);
          setProgress(1 - (1 - elapsed) ** 3);
          if (elapsed < 1) frame = window.requestAnimationFrame(animate);
        };
        frame = window.requestAnimationFrame(animate);
      },
      { threshold: 0.25 },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`container mx-auto grid max-w-5xl gap-6 px-4 text-center sm:px-6 ${
        stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
      }`}
    >
      {stats.map((stat, index) => (
        <div
          key={`${stat.label}-${index}`}
          className={stats.length === 3 && index === 2 ? "col-span-2 md:col-span-1" : ""}
        >
          <p
            className="font-serif text-[clamp(26px,4vw,40px)] font-bold italic"
            style={{ color: "var(--portfolio-accent)" }}
          >
            {progress === null ? stat.valeur : formatValue(stat.valeur, progress)}
          </p>
          <p
            className="mt-1 font-sans text-[10.5px] tracking-wider uppercase"
            style={{ color: "var(--portfolio-muted)" }}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
