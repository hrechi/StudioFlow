import { cn } from "@/lib/utils";
import { MONOGRAM_PATH, MONOGRAM_VIEWBOX, WORDMARK_PATH, WORDMARK_VIEWBOX } from "./logo-paths";

type LogoProps = {
  /** "onDark" = off-white wordmark (default, the UI is dark), "onLight" = black wordmark. */
  tone?: "onLight" | "onDark";
  /** false = "RF" monogram only (collapsed sidebar, tiny spaces). */
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  /** Sizes the mark itself (height; width follows the logo's proportions). */
  iconClassName?: string;
};

/**
 * ReFrame logo, traced from docs/screens/logo reframe 2.jpg (see logo-paths.ts).
 * Drawn with currentColor, so one shape serves both versions: off-white on dark
 * backgrounds, black on light ones. Never stretch it: only set a height.
 */
export function Logo({
  tone = "onDark",
  showWordmark = true,
  showTagline = false,
  className,
  iconClassName,
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-start gap-2 leading-none",
        tone === "onDark" ? "text-bone" : "text-ink",
        className,
      )}
    >
      <svg
        role="img"
        aria-label="ReFrame"
        viewBox={showWordmark ? WORDMARK_VIEWBOX : MONOGRAM_VIEWBOX}
        className={cn("h-[1.05rem] w-auto shrink-0", iconClassName)}
      >
        <path fill="currentColor" d={showWordmark ? WORDMARK_PATH : MONOGRAM_PATH} />
      </svg>
      {showTagline && showWordmark && (
        <span
          className={cn(
            "text-[0.6rem] font-medium tracking-[0.42em] uppercase",
            tone === "onDark" ? "text-bone/55" : "text-ink/60",
          )}
        >
          Photography studio
        </span>
      )}
    </span>
  );
}
