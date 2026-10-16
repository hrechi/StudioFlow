/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { requireArea } from "@/lib/guards";
import { NotificationsPage } from "@/modules/utilisateurs/components/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function DashboardNotificationsPage({
  searchParams,
}: PageProps<"/dashboard/notifications">) {
  const user = await requireArea("dashboard");
  const { page } = await searchParams;
  return (
    <NotificationsPage
      userId={user.id}
      page={Math.max(1, Number(page) || 1)}
      basePath="/dashboard/notifications"
    />
  );
}
