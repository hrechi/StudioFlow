/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { requireArea } from "@/lib/guards";
import { NotificationsPage } from "@/modules/utilisateurs/components/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function EspaceClientNotificationsPage({
  searchParams,
}: PageProps<"/espace-client/notifications">) {
  const user = await requireArea("espace-client");
  const { page } = await searchParams;
  return (
    <NotificationsPage
      userId={user.id}
      page={Math.max(1, Number(page) || 1)}
      basePath="/espace-client/notifications"
    />
  );
}
