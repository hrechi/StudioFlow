"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../notification.actions";
import type { NotificationDTO } from "../utilisateur.types";
import { NotificationItemContent } from "./notification-item";

type NotificationBellProps = {
  latest: NotificationDTO[];
  unread: number;
  /** "/dashboard/notifications" or "/espace-client/notifications". */
  listHref: string;
  /** "dark" when placed on a dark header. */
  tone?: "light" | "dark";
};

/** Top-bar bell: unread count + the 5 latest notifications from MongoDB. */
export function NotificationBell({
  latest,
  unread,
  listHref,
  tone = "light",
}: NotificationBellProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const markAll = () =>
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });

  const open = (notification: NotificationDTO) =>
    startTransition(async () => {
      if (!notification.estLue) await markNotificationReadAction(notification.id);
      if (notification.lienCible) router.push(notification.lienCible);
      router.refresh();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            tone === "dark" && "text-white hover:bg-white/10 hover:text-white",
          )}
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-bold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-charcoal">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              markAll();
            }}
            disabled={pending || unread === 0}
            className="text-primary-text"
          >
            <CheckCheck aria-hidden />
            Mark all as read
          </Button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto p-1">
          {latest.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            latest.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onSelect={() => open(notification)}
                className={cn(
                  "items-start rounded-lg px-3 py-2.5",
                  !notification.estLue && "bg-accent/50",
                )}
              >
                <NotificationItemContent notification={notification} compact />
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          asChild
          className="justify-center rounded-none py-2.5 text-sm font-semibold text-primary-text"
        >
          <Link href={listHref}>View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
