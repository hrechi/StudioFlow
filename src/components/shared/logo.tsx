import { useId } from "react";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** "onLight" = dark wordmark (light backgrounds), "onDark" = white wordmark. */
  tone?: "onLight" | "onDark";
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  iconClassName?: string;
};

/** StudioFlow "S" ribbon mark (from the cahier, p.19) + wordmark. */
export function Logo({
  tone = "onLight",
  showWordmark = true,
  showTagline = false,
  className,
  iconClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8 shrink-0", iconClassName)} />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-xl font-extrabold tracking-tight",
              tone === "onDark" ? "text-white" : "text-charcoal",
            )}
          >
            Studio
            <span className="bg-gradient-to-r from-[#146bff] to-[#7546e8] bg-clip-text text-transparent">
              Flow
            </span>
          </span>
          {showTagline && (
            <span
              className={cn(
                "mt-1 text-[0.6rem] font-semibold tracking-[0.28em] uppercase",
                tone === "onDark" ? "text-sidebar-muted" : "text-muted-foreground",
              )}
            >
              Photography Studio OS
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="4 2 96 100" aria-hidden="true" className={className}>
      <defs>
        <linearGradient
          id={`${id}a`}
          x1="76"
          y1="17"
          x2="36"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#36B8F4" />
          <stop offset="1" stopColor="#146BFF" />
        </linearGradient>
        <linearGradient
          id={`${id}b`}
          x1="42"
          y1="48"
          x2="62"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#146BFF" />
          <stop offset="1" stopColor="#7546E8" />
        </linearGradient>
        <linearGradient
          id={`${id}c`}
          x1="66"
          y1="60"
          x2="24"
          y2="87"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7546E8" />
          <stop offset="0.45" stopColor="#146BFF" />
          <stop offset="1" stopColor="#36B8F4" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="22">
        <path stroke={`url(#${id}a)`} d="M76 17.2 L43.7 30.5 C32.6 35.1 32.3 43.4 43.1 48.8" />
        <path stroke={`url(#${id}c)`} d="M56.7 55.7 C67.5 61.1 67.2 69.4 56.1 74 L23.8 87.3" />
        <path stroke={`url(#${id}b)`} d="M43.1 48.8 L56.7 55.7" />
      </g>
    </svg>
  );
}
