"use client";

import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../notification.actions";
import type { NotificationDTO } from "../utilisateur.types";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsReadAction();
          if (result.ok) toast.success("All notifications marked as read");
          else toast.error(result.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
      Mark all as read
    </Button>
  );
}

/** Clickable row: marks the notification as read and opens its target link. */
export function NotificationLink({
  notification,
  children,
}: {
  notification: NotificationDTO;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!notification.estLue) await markNotificationReadAction(notification.id);
          if (notification.lienCible) router.push(notification.lienCible);
          router.refresh();
        })
      }
      className={cn(
        "w-full px-4 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60",
        !notification.estLue && "bg-accent/40",
      )}
    >
      {children}
    </button>
  );
}
