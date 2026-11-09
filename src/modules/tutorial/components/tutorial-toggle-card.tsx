"use client";

import { Hand } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { setTutorialEnabledAction } from "../tutorial.actions";
import { TOUR_EVENT, type TourEventDetail } from "./tutorial-provider";

/** Profile card: turn the guided tour on (it starts right away) or off. */
export function TutorialToggleCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  const change = (next: boolean) => {
    setOn(next);
    startTransition(async () => {
      const result = await setTutorialEnabledAction(next);
      if (!result.ok) {
        setOn(!next);
        toast.error(result.error);
        return;
      }
      window.dispatchEvent(
        new CustomEvent<TourEventDetail>(TOUR_EVENT, { detail: { action: next ? "start" : "stop" } }),
      );
      if (!next) toast.success("Guided tour turned off");
      router.refresh();
    });
  };

  return (
    <Card data-tour="tutorial-toggle">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="size-4 text-primary" aria-hidden />
          Guided tour
        </CardTitle>
        <CardDescription>
          A step-by-step walkthrough of the main features. It switches itself off when you finish
          it or sign out. Notifications that need an action are always guided.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-center justify-between gap-3 text-sm text-slate">
          {on ? "On: the tour shows until you finish it or sign out" : "Off"}
          <Switch
            checked={on}
            disabled={pending}
            onCheckedChange={change}
            aria-label="Guided tour"
          />
        </label>
      </CardContent>
    </Card>
  );
}
