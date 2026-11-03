/* Module : Gestion des Invitations */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { InvitationsAdmin } from "@/modules/invitations/components/invitations-admin";
import { getParametresInvitation, listAccesClients } from "@/modules/invitations/invitation.acces";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsAdminPage() {
  const user = await requireArea("facturation");
  const [parametres, acces] = await Promise.all([getParametresInvitation(), listAccesClients(user)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Invitations" description="The price of the invitation editor, and the clients who asked for it." />
      <InvitationsAdmin parametres={parametres} acces={acces} />
    </div>
  );
}
