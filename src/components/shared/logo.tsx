import { cn } from "@/lib/utils";
import { MONOGRAM_PATH, MONOGRAM_VIEWBOX, WORDMARK_PATH, WORDMARK_VIEWBOX } from "./logo-paths";

type LogoProps = {
  /**
   * "auto" (default) follows the light / dark mode. "onDark" = off-white wordmark
   * (always, e.g. over photos), "onLight" = black wordmark (always).
   */
  tone?: "auto" | "onLight" | "onDark";
  /** false = "RF" monogram only (collapsed sidebar, tiny spaces). */
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  /** Sizes the mark itself (height; width follows the logo's proportions). */
  iconClassName?: string;
};

/**
 * ReFrame logo, traced from docs/screens/logo reframe 2.jpg (see logo-paths.ts).
 * Drawn with currentColor, so one shape gives both official versions: white on
 * black in dark mode, black on white in light mode. Never stretch it: only set a height.
 */
export function Logo({
  tone = "auto",
  showWordmark = true,
  showTagline = false,
  className,
  iconClassName,
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-start gap-2 leading-none",
        tone === "auto" ? "text-foreground" : tone === "onDark" ? "text-bone" : "text-ink",
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
        <span className={cn("text-[0.6rem] font-medium tracking-[0.42em] uppercase", "opacity-60")}>
          Photography studio
        </span>
      )}
    </span>
  );
}
