import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Logo />
      <span className="grid size-16 place-items-center rounded-2xl bg-accent text-primary-text">
        <Compass className="size-8" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-medium tracking-[0.08em] text-foreground uppercase">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This page doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
