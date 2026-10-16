import { ClientShell } from "@/components/layout/client-shell";
import { requireArea } from "@/lib/guards";
import { getNotificationSummary } from "@/modules/utilisateurs/notification.service";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

/** Client area (front office, CLIENT only). */
export default async function ClientLayout({ children }: LayoutProps<"/espace-client">) {
  const user = await requireArea("espace-client");
  const notifications = await getNotificationSummary(user.id);

  return (
    <ClientShell
      user={{
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        photoProfil: user.photoProfil,
        roleLabel: user.entreprise || roleConfig[user.role].label,
      }}
      notifications={notifications}
    >
      {children}
    </ClientShell>
  );
}
