import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Purple "AI" label: marks every AI-generated value, suggestion or panel (charter §7). */
export function AIBadge({ label = "AI", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full bg-ai-soft px-2 text-[0.7rem] font-semibold text-ai-text ring-1 ring-ai/25 ring-inset",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {label}
    </span>
  );
}
