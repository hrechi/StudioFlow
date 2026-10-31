import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/**
 * Shown by the service worker (public/sw.js) when a page is opened without a connection
 * and no saved copy exists. Static: it is cached on the device when the app is installed.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-center">
      <Logo iconClassName="h-6" />
      <div className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-7" aria-hidden />
      </div>
      <div className="max-w-md space-y-3">
        <h1 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
          You&apos;re offline
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          This page has not been saved on your device yet. Pages you already opened (home,
          portfolio…) still work. Reconnect to see your galleries, reservations and dashboard.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <RetryButton />
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
