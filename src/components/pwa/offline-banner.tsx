"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/**
 * Shown on every page while the connection is down (next.config.ts → experimental.useOffline).
 * Navigations and Server Actions started offline wait, then run once the connection is back.
 */
export function OfflineBanner() {
  const isOffline = useOffline();
  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 bg-foreground px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-center text-xs font-medium text-background sm:text-sm"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You&apos;re offline. Saved pages still work; your changes will be sent once you&apos;re back
      online.
    </div>
  );
}
