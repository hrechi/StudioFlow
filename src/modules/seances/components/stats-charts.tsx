/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Charts of the Statistics page. Pure SVG / CSS, rendered on the server (no chart library, no
 * client JavaScript). Each chart has a text alternative for screen readers.
 */
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5, #3b82f6)",
] as const;

// ── Trend (area + line) ──────────────────────────────────────────────────────

export type TrendPoint = { label: string; value: number };

/** Rounds a maximum up to a "nice" axis top (1, 2, 5 × 10ⁿ per step), 4 steps. */
function axis(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  return { top: step * 4, step };
}

export function TrendChart({
  id,
  points,
  color = CHART_COLORS[0],
  format = (v: number) => String(v),
  formatFull,
  label,
}: {
  id: string;
  points: TrendPoint[];
  color?: string;
  /** Short format for axis and point labels. */
  format?: (v: number) => string;
  /** Exact format for tooltips and the screen-reader text (defaults to `format`). */
  formatFull?: (v: number) => string;
  label: string;
}) {
  const W = 640;
  const H = 230;
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const max = Math.max(0, ...points.map((p) => p.value));
  if (points.length === 0 || max === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this period.</p>;
  }
  const full = formatFull ?? format;
  const { top, step } = axis(max);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const labelEvery = Math.ceil(points.length / 8);
  const showValues = points.length <= 8;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {format(t)}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.value)} r="4" fill="var(--card, #fff)" stroke={color} strokeWidth="2.5">
              <title>{`${p.label}: ${full(p.value)}`}</title>
            </circle>
            {showValues && p.value > 0 && (
              <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {format(p.value)}
              </text>
            )}
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">
        {points.map((p) => `${p.label}: ${full(p.value)}`).join(", ")}
      </figcaption>
    </figure>
  );
}

// ── Donut ────────────────────────────────────────────────────────────────────

export type DonutSlice = { label: string; value: number; color?: string; display?: string };

export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  label,
  compact = false,
}: {
  slices: DonutSlice[];
  centerValue: string | number;
  centerLabel: string;
  label: string;
  /** Smaller ring, more room for the legend (narrow cards, e.g. the dashboard). */
  compact?: boolean;
}) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((a, s) => a + s.value, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this period.</p>;
  }
  const r = 52;
  const c = 2 * Math.PI * r;
  // Where each slice starts on the ring (computed up front: no mutation while rendering).
  const lengths = data.map((s) => (s.value / total) * c);
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, l) => a + l, 0));
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className={cn("relative shrink-0", compact ? "size-32" : "size-40")}>
        <svg viewBox="0 0 140 140" role="img" aria-label={label} className="size-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="16" className="text-muted" />
          {data.map((s, i) => {
            const len = lengths[i];
            const gap = data.length > 1 ? 2 : 0;
            return (
              <circle
                key={s.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
                strokeDashoffset={-starts[i]}
              >
                <title>{`${s.label}: ${s.display ?? s.value}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl leading-none font-bold tabular-nums">{centerValue}</span>
          <span className="mt-1 text-[0.7rem] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {data.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{s.label}</span>
            <span className="tabular-nums font-semibold">{s.display ?? s.value}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Columns (weekday profile) ────────────────────────────────────────────────

export function ColumnChart({ items, label }: { items: { label: string; value: number }[]; label: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (max === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this period.</p>;
  }
  return (
    <div role="img" aria-label={label} className="flex h-44 items-end gap-2">
      {items.map((it) => {
        const h = Math.max(4, Math.round((it.value / max) * 100));
        const peak = it.value === max;
        return (
          <div key={it.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-foreground">{it.value}</span>
            <div
              className={cn("w-full rounded-t-md transition-all", peak ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${h}%` }}
              title={`${it.label}: ${it.value}`}
            />
            <span className="text-[0.7rem] text-muted-foreground">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison badge ─────────────────────────────────────────────────────────

/**
 * "vs previous period" badge. `kind` "pct" = relative change of a count; "pts" = difference in
 * percentage points between two rates. `goodWhen` tells which direction is positive news.
 */
export function Delta({
  actuel,
  precedent,
  kind = "pct",
  goodWhen = "up",
}: {
  actuel: number | null;
  precedent: number | null | undefined;
  kind?: "pct" | "pts";
  goodWhen?: "up" | "down";
}) {
  if (actuel === null || precedent === null || precedent === undefined) return null;
  if (kind === "pct" && precedent <= 0) return null;
  const diff = kind === "pct" ? ((actuel - precedent) / precedent) * 100 : actuel - precedent;
  const rounded = Math.round(diff * 10) / 10;
  const dir = rounded === 0 ? "flat" : rounded > 0 ? "up" : "down";
  const good = dir === "flat" ? null : dir === goodWhen;
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : ArrowRight;
  const text = `${rounded > 0 ? "+" : ""}${rounded}${kind === "pct" ? "%" : " pts"}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold",
        good === null && "bg-muted text-muted-foreground",
        good === true && "bg-success/10 text-success-text",
        good === false && "bg-destructive/10 text-destructive-text",
      )}
      title="Compared with the previous period of the same length"
    >
      <Icon className="size-3" aria-hidden />
      {text}
      <span className="sr-only"> compared with the previous period</span>
    </span>
  );
}
