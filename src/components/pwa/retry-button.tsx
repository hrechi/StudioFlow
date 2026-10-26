"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reloads the page the user asked for (the URL stays the same on the offline page). */
export function RetryButton() {
  return (
    <Button onClick={() => window.location.reload()}>
      <RotateCw aria-hidden />
      Try again
    </Button>
  );
}
