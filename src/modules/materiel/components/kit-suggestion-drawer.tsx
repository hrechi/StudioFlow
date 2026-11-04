"use client";

import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KitSuggestion } from "./kit-suggestion";
import type { SeanceReservableDTO } from "../seance-source";

export function KitSuggestionDrawer({ seances }: { seances: SeanceReservableDTO[] }) {
  const [open, setOpen] = useState(true);

  return (
    <aside className="self-start xl:sticky xl:top-4">
      <Button
        className="mb-2 w-full justify-between xl:hidden"
        variant="ai-soft"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles aria-hidden />
          Suggest kit
        </span>
        {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
      </Button>
      <div className={open ? "block" : "hidden xl:block"}>
        <KitSuggestion seances={seances} />
      </div>
    </aside>
  );
}
