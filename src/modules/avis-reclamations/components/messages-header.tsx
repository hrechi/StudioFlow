import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Compact title row above the inbox, so the conversation keeps most of the screen. */
export function MessagesHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-1">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
        <h1 className="font-heading text-xl font-medium tracking-[0.12em] text-foreground uppercase">
          Messages
        </h1>
      </div>
      <p className="text-xs text-muted-foreground">One conversation per complaint</p>
    </div>
  );
}
