"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Body of every error.tsx boundary: message + retry (Next.js 16 `retry()` re-fetches the segment). */
export function ErrorState({
  error,
  retry,
  title = "Something went wrong",
}: {
  error: unknown;
  retry: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive-text">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-charcoal">{title}</h2>
        <p className="text-sm text-muted-foreground">
          The page could not be loaded. Check that MongoDB is running, then try again.
        </p>
        {digest && <p className="text-xs text-muted-foreground">Reference: {digest}</p>}
      </div>
      <Button onClick={() => retry()}>
        <RotateCcw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
