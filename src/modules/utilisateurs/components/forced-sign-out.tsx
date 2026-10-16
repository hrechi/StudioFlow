"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { forcedSignOutAction } from "../utilisateur.actions";

export function ForcedSignOut({ raison }: { raison: string }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void forcedSignOutAction(raison);
  }, [raison]);

  return (
    <main className="grid flex-1 place-items-center p-8">
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Signing you out…
      </p>
    </main>
  );
}
