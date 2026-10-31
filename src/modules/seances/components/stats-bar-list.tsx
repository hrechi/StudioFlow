import { largeurBarre } from "../stats.rules";

export type BarItem = { label: string; value: number; display?: string; hint?: string };

// One gradient per position — cycles through 5 brand-friendly hues
const GRADIENTS = [
  "from-primary to-primary/60",
  "from-[#8b6fcb] to-[#8b6fcb]/60",
  "from-success to-success/60",
  "from-[#e07b39] to-[#e07b39]/60",
  "from-[#3b82f6] to-[#3b82f6]/60",
];

export function StatsBarList({
  items,
  empty = "No data for this period.",
  tone,
}: {
  items: BarItem[];
  empty?: string;
  /** Override gradient for every bar (e.g. "from-warning to-warning/60"). */
  tone?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || max === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item, idx) => {
        const gradient = tone ?? GRADIENTS[idx % GRADIENTS.length];
        const w = largeurBarre(item.value, max);
        return (
          <li key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">
                {item.display ?? item.value}
                {item.hint && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {item.hint}
                  </span>
                )}
              </span>
            </div>
            {/* Track */}
            <div className="relative h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              {/* Glow layer */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r opacity-20 blur-sm ${gradient}`}
                style={{ width: `${Math.min(w + 4, 100)}%` }}
              />
              {/* Solid bar */}
              <div
                className={`relative h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${gradient}`}
                style={{ width: `${w}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
