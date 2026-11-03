import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { listNotifications } from "../notification.service";
import { MarkAllReadButton, NotificationLink } from "./notification-actions";
import { NotificationItemContent } from "./notification-item";

/** Full notifications list, shared by the backoffice and the client area. */
export async function NotificationsPage({
  userId,
  page,
  basePath,
}: {
  userId: string;
  page: number;
  basePath: string;
}) {
  const result = await listNotifications(userId, { page, pageSize: 15 });
  const hasUnread = result.items.some((n) => !n.estLue);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Sessions, galleries, invoices, complaints and account: everything that concerns you."
        actions={<MarkAllReadButton disabled={!hasUnread} />}
      />
      {result.items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="You'll be notified here as soon as there's something new."
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {result.items.map((notification) => (
              <li key={notification.id}>
                <NotificationLink notification={notification}>
                  <NotificationItemContent notification={notification} />
                </NotificationLink>
              </li>
            ))}
          </ul>
          {result.pageCount > 1 && (
            <div className="border-t px-4 py-3">
              <Pagination
                basePath={basePath}
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                label="notifications"
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
