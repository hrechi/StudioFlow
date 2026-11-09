import { ClientShell } from "@/components/layout/client-shell";
import { requireArea } from "@/lib/guards";
import { TutorialProvider } from "@/modules/tutorial/components/tutorial-provider";
import { getNotificationSummary } from "@/modules/utilisateurs/notification.service";
import { isTutorialEnabled } from "@/modules/utilisateurs/utilisateur.service";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

/** Client area (front office, CLIENT only). */
export default async function ClientLayout({ children }: LayoutProps<"/espace-client">) {
  const user = await requireArea("espace-client");
  const [notifications, tutorial] = await Promise.all([
    getNotificationSummary(user.id),
    isTutorialEnabled(user.id),
  ]);

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
      {/* Guided tour: first login, re-enabled from the profile, or a notification to act on. */}
      <TutorialProvider
        userId={user.id}
        role={user.role}
        enabled={tutorial}
        notifications={notifications.latest
          .filter((n) => !n.estLue)
          .map((n) => ({ id: n.id, titre: n.titre, message: n.message, lienCible: n.lienCible }))}
      />
    </ClientShell>
  );
}
