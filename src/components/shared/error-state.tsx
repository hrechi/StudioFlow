"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Body of every error.tsx boundary: message + retry (Next.js 16 `retry()` re-fetches the segment). */
export function ErrorState({
  errorMessage,
  digest,
  retry,
  title = "Something went wrong",
}: {
  errorMessage?: string;
  digest?: string;
  retry: () => void;
  title?: string;
}) {
  const isStaleServerAction =
    errorMessage?.includes("was not found on the server") ||
    errorMessage?.includes("Failed to find Server Action");

  useEffect(() => {
    if (errorMessage) {
      console.error(errorMessage);
    }
  }, [errorMessage]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive-text">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-medium tracking-[0.08em] text-foreground uppercase">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {isStaleServerAction
            ? "This page belongs to an older version of the app. Refresh it to continue."
            : "The page could not be loaded. Check that MongoDB is running, then try again."}
        </p>
        {digest && <p className="text-xs text-muted-foreground">Reference: {digest}</p>}
      </div>
      <Button
        onClick={() => {
          if (isStaleServerAction) window.location.reload();
          else retry();
        }}
      >
        <RotateCcw aria-hidden />
        {isStaleServerAction ? "Refresh page" : "Try again"}
      </Button>
    </div>
  );
}
