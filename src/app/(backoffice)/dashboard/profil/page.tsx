/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ProfileView } from "@/modules/utilisateurs/components/profile-view";
import { isLastActiveAdmin } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "My profile" };

export default async function DashboardProfilPage() {
  const user = await requireArea("dashboard");
  const isLastAdmin = await isLastActiveAdmin(user);
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Manage your information, your password and your account."
      />
      <ProfileView user={user} isLastAdmin={isLastAdmin} />
    </div>
  );
}
