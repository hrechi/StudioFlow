import {
  Bell,
  CalendarDays,
  Images,
  MessageSquareWarning,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import type { NotificationDTO, TypeNotification } from "../utilisateur.types";

const typeIcons: Record<TypeNotification, { icon: LucideIcon; className: string }> = {
  SYSTEME: { icon: Bell, className: "bg-muted text-slate" },
  COMPTE: { icon: UserRound, className: "bg-accent text-primary-text" },
  SEANCE: { icon: CalendarDays, className: "bg-accent text-primary-text" },
  GALERIE: { icon: Images, className: "bg-success/10 text-success-text" },
  FACTURATION: { icon: Receipt, className: "bg-warning/10 text-warning-text" },
  RECLAMATION: { icon: MessageSquareWarning, className: "bg-destructive/10 text-destructive-text" },
};

/** One notification row (icon by type, title, message, relative date, unread dot). */
export function NotificationItemContent({
  notification,
  compact = false,
}: {
  notification: NotificationDTO;
  compact?: boolean;
}) {
  const { icon: Icon, className } = typeIcons[notification.type];
  return (
    <div className="flex w-full items-start gap-3 text-left">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", className)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm text-charcoal",
            notification.estLue ? "font-medium" : "font-semibold",
            compact && "truncate",
          )}
        >
          {notification.titre}
        </p>
        <p className={cn("text-xs text-muted-foreground", compact ? "line-clamp-2" : "mt-0.5")}>
          {notification.message}
        </p>
        <p className="mt-1 text-[0.7rem] text-muted-foreground">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
      {!notification.estLue && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </div>
  );
}
