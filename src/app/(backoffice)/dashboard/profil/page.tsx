/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { VisaStudioCard } from "@/modules/facturation/components/visa-studio";
import { getVisaStudio } from "@/modules/facturation/visa.service";
import { WalletLinkCard } from "@/modules/snapseal/components/wallet-link-card";
import { getSnapSealConfig } from "@/modules/snapseal/snapseal.config";
import { ProfileView } from "@/modules/utilisateurs/components/profile-view";
import {
  getUtilisateurWallet,
  isLastActiveAdmin,
} from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "My profile" };

export default async function DashboardProfilPage() {
  const user = await requireArea("dashboard");
  const isLastAdmin = await isLastActiveAdmin(user);
  const visa = user.role === "ADMIN" ? await getVisaStudio(user) : null;
  // SnapSeal: only when the contracts are configured.
  const wallet = getSnapSealConfig() ? await getUtilisateurWallet(user.id) : undefined;
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Manage your information, your password and your account."
      />
      <ProfileView user={user} isLastAdmin={isLastAdmin} />
      {wallet !== undefined && <WalletLinkCard userId={user.id} linkedAddress={wallet} role="STAFF" />}
      {visa && <VisaStudioCard visa={visa} />}
    </div>
  );
}
