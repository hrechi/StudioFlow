import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Entry point to a gallery's SnapSeal page, used on the staff and the client gallery pages:
 * a real button (not a text link), with the proof's current stage when there is one.
 */
export function BlockchainProofButton({
  href,
  stage,
  required,
  className,
}: {
  href: string;
  /** e.g. "Sealed", "Selection recorded", "Delivered"; omitted while nothing is on-chain. */
  stage?: string;
  /** The gallery requires the proof: the button is emphasized. */
  required?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-soft transition-all",
        "border-primary/40 bg-primary/10 text-foreground hover:border-primary hover:bg-primary/15",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        required && "border-primary bg-primary/15",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span>Blockchain proof</span>
        <span
          className={cn(
            "text-xs font-normal",
            stage ? "font-semibold text-success-text" : "text-muted-foreground",
          )}
        >
          {stage ?? "Seal, selection and delivery on-chain"}
        </span>
      </span>
      <ArrowRight
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  );
}
