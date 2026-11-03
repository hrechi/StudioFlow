import { largeurBarre } from "../stats.rules";

export type BarItem = { label: string; value: number; display?: string; hint?: string };

/** Horizontal bars, pure CSS. The value is always written next to the bar (not color only). */
export function StatsBarList({
  items,
  empty = "No data for this period.",
  tone = "bg-primary",
}: {
  items: BarItem[];
  empty?: string;
  tone?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || max === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 tabular-nums text-slate">
              {item.display ?? item.value}
              {item.hint && <span className="ml-1.5 text-xs text-muted-foreground">{item.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${largeurBarre(item.value, max)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
