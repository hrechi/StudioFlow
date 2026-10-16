import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const styles = {
  error: { box: "border-destructive/25 bg-destructive/5 text-destructive-text", Icon: AlertCircle },
  success: { box: "border-success/25 bg-success/5 text-success-text", Icon: CheckCircle2 },
  info: { box: "border-primary/20 bg-accent text-primary-text", Icon: Info },
  warning: { box: "border-warning/30 bg-warning/5 text-warning-text", Icon: AlertCircle },
} as const;

/** Inline message above a form (server error, info after redirect...). */
export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: keyof typeof styles;
  children: ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        box,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="font-medium">{children}</div>
    </div>
  );
}
