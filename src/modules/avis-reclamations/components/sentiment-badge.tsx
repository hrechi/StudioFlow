import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { sentimentConfig, type Sentiment } from "../avis.types";

const tone: Record<Sentiment, string> = {
  POSITIF: "bg-success/10 text-success-text ring-success/25",
  NEUTRE: "bg-muted text-slate ring-border",
  NEGATIF: "bg-destructive/10 text-destructive-text ring-destructive/20",
};

/** AI sentiment: color by sentiment + purple sparkles to show it comes from the AI. */
export function SentimentBadge({
  sentiment,
  score,
  className,
}: {
  sentiment: Sentiment;
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset",
        tone[sentiment],
        className,
      )}
      title="Sentiment analysis by the AI"
    >
      <Sparkles className="size-3 text-ai" aria-label="AI" />
      {sentimentConfig[sentiment].label}
      {score !== undefined && (
        <span className="font-normal opacity-75">{Math.round(score * 100)}%</span>
      )}
    </span>
  );
}
