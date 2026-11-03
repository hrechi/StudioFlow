import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-accent text-primary-text",
  green: "bg-success/10 text-success-text",
  amber: "bg-warning/10 text-warning-text",
  red: "bg-destructive/10 text-destructive-text",
  ai: "bg-ai-soft text-ai-text",
  neutral: "bg-muted text-slate",
} as const;

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  /** Small line under the value: trend, comparison, hint. */
  hint?: ReactNode;
  className?: string;
};

/** KPI card (icon in a tinted square + label + big number), as on the dashboard screenshot. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl sm:size-11",
          tones[tone],
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-heading text-2xl leading-tight font-medium tracking-wide text-foreground tabular-nums">
          {value}
        </p>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}
