"use client";

import { Copy, UsersRound } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const noopSubscribe = () => () => {};

/** Client area: the link to send to a guest for a second opinion (view only). */
export function GuestLinkBox({ path, protegee }: { path: string; protegee: boolean }) {
  // Origin only exists in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const lien = `${origin}${path}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-soft ring-1 ring-border sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 sm:flex-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-primary-text">
          <UsersRound className="size-4" aria-hidden />
        </span>
        <p className="text-sm text-slate">
          <span className="font-semibold text-foreground">Want a second opinion?</span> Send this
          link to a guest
          {protegee ? " with the gallery password the studio gave you" : ""}. They can view the
          photos, but not download them or change your selection.
        </p>
      </div>
      <div className="flex gap-2 sm:w-96">
        <Input readOnly value={lien} aria-label="Guest link" className="h-9 bg-surface text-xs" />
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy the guest link"
          onClick={() => {
            void navigator.clipboard?.writeText(lien);
            toast.success("Link copied");
          }}
        >
          <Copy aria-hidden />
        </Button>
      </div>
    </div>
  );
}
