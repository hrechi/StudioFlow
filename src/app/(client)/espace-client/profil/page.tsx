/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ProfileView } from "@/modules/utilisateurs/components/profile-view";

export const metadata: Metadata = { title: "My profile" };

export default async function EspaceClientProfilPage() {
  const user = await requireArea("espace-client");
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your contact details, your password and your account."
      />
      <ProfileView user={user} isLastAdmin={false} />
    </div>
  );
}
