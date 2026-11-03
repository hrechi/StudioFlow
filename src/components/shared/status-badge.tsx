import { cn } from "@/lib/utils";

export type StatusTone =
  "neutral" | "info" | "success" | "warning" | "danger" | "ai" | "dark" | "outline";

/** One entry per enum value: label shown in the UI + color tone. */
export type StatusConfig<T extends string> = Record<T, { label: string; tone: StatusTone }>;

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-slate ring-border",
  info: "bg-accent text-primary-text ring-primary/20",
  success: "bg-success/10 text-success-text ring-success/25",
  warning: "bg-warning/10 text-warning-text ring-warning/25",
  danger: "bg-destructive/10 text-destructive-text ring-destructive/20",
  ai: "bg-ai-soft text-ai-text ring-ai/25",
  dark: "bg-foreground text-background ring-bone",
  outline: "bg-card text-slate ring-light-gray",
};

const dotClasses: Record<StatusTone, string> = {
  neutral: "bg-gray",
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  ai: "bg-ai",
  dark: "bg-background",
  outline: "bg-gray",
};

type StatusBadgeProps<T extends string> = {
  value: T;
  config: StatusConfig<T>;
  /** Show a small colored dot so status is not conveyed by color alone. */
  dot?: boolean;
  className?: string;
};

export function StatusBadge<T extends string>({
  value,
  config,
  dot = true,
  className,
}: StatusBadgeProps<T>) {
  const entry = config[value];
  return <ToneBadge tone={entry.tone} label={entry.label} dot={dot} className={className} />;
}

export function ToneBadge({
  tone,
  label,
  dot = false,
  className,
}: {
  tone: StatusTone;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", dotClasses[tone])} />}
      {label}
    </span>
  );
}
