import { BackofficeShell } from "@/components/layout/backoffice-shell";
import { requireArea } from "@/lib/guards";
import { getNotificationSummary } from "@/modules/utilisateurs/notification.service";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

/** Backoffice (ADMIN / PHOTOGRAPHE / RETOUCHEUR). Each page also checks its own module permission. */
export default async function BackofficeLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireArea("dashboard");
  const notifications = await getNotificationSummary(user.id);

  return (
    <BackofficeShell
      user={{
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        photoProfil: user.photoProfil,
        role: user.role,
        roleLabel: roleConfig[user.role].label,
      }}
      notifications={notifications}
    >
      {children}
    </BackofficeShell>
  );
}
