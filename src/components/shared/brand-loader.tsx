import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/** Full-area loader: the wordmark with a thin gold line sweeping under it. */
export function BrandLoader({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5",
        className,
      )}
    >
      <Logo iconClassName="h-5 opacity-90" />
      <span className="relative block h-px w-40 overflow-hidden bg-foreground/10" aria-hidden>
        <span className="absolute inset-y-0 left-0 w-1/2 animate-[loader-sweep_1.4s_ease-in-out_infinite] bg-gold" />
      </span>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
