import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AIBadge } from "./ai-badge";

type AIPanelProps = {
  title: string;
  /** One short sentence explaining where the suggestion comes from (charter §7: AI transparency). */
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Purple panel for AI suggestions, insights and recommendations. Purple = AI only. */
export function AIPanel({ title, description, children, footer, className }: AIPanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-ai-soft via-card to-card p-5 shadow-soft ring-1 ring-ai/20",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-ai/10 blur-2xl"
      />
      <header className="relative mb-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <AIBadge />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="relative">{children}</div>
      {footer && <div className="relative mt-4 border-t border-ai/15 pt-3">{footer}</div>}
    </section>
  );
}

/** Confidence bar for AI values (only shown when the model returns a real score). */
export function AIConfidence({ value, label = "Confidence" }: { value: number; label?: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ai/15" aria-hidden>
        <span className="block h-full rounded-full bg-ai" style={{ width: `${percent}%` }} />
      </span>
      <span className="font-semibold text-ai-text">{percent}%</span>
    </div>
  );
}
