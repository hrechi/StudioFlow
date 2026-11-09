import { BackofficeShell } from "@/components/layout/backoffice-shell";
import { requireArea } from "@/lib/guards";
import { TutorialProvider } from "@/modules/tutorial/components/tutorial-provider";
import { getNotificationSummary } from "@/modules/utilisateurs/notification.service";
import { isTutorialEnabled } from "@/modules/utilisateurs/utilisateur.service";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

/** Backoffice (ADMIN / PHOTOGRAPHE). Each page also checks its own module permission. */
export default async function BackofficeLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireArea("dashboard");
  const [notifications, tutorial] = await Promise.all([
    getNotificationSummary(user.id),
    isTutorialEnabled(user.id),
  ]);

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
      {/* Guided tour: first login, re-enabled from the profile, or a notification to act on. */}
      <TutorialProvider
        userId={user.id}
        role={user.role}
        enabled={tutorial}
        notifications={notifications.latest
          .filter((n) => !n.estLue)
          .map((n) => ({ id: n.id, titre: n.titre, message: n.message, lienCible: n.lienCible }))}
      />
    </BackofficeShell>
  );
}
