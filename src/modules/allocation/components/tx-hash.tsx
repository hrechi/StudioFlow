"use client";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Shortened transaction hash with a copy button (works on Ganache, which has no block explorer). */
export function TxHash({
  hash,
  block,
  className,
}: {
  hash: string;
  block?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs", className)}>
      <span title={hash}>
        {hash.slice(0, 10)}…{hash.slice(-6)}
      </span>
      {block !== undefined && <span className="text-muted-foreground">· block {block}</span>}
      <button
        type="button"
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Copy transaction hash"
        onClick={() => {
          void navigator.clipboard.writeText(hash);
          toast.info("Transaction hash copied");
        }}
      >
        <Copy className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
