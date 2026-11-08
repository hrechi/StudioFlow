/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { WalletLinkCard } from "@/modules/snapseal/components/wallet-link-card";
import { getSnapSealConfig } from "@/modules/snapseal/snapseal.config";
import { ProfileView } from "@/modules/utilisateurs/components/profile-view";
import { getUtilisateurWallet } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "My profile" };

export default async function EspaceClientProfilPage() {
  const user = await requireArea("espace-client");
  // SnapSeal: only when the contracts are configured.
  const wallet = getSnapSealConfig() ? await getUtilisateurWallet(user.id) : undefined;
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your contact details, your password and your account."
      />
      <ProfileView user={user} isLastAdmin={false} />
      {wallet !== undefined && <WalletLinkCard userId={user.id} linkedAddress={wallet} role="CLIENT" />}
    </div>
  );
}
