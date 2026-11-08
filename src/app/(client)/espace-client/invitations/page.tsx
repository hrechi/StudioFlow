/* Module : Gestion des Invitations */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { InvitationLock } from "@/modules/invitations/components/invitation-lock";
import { InvitationsList } from "@/modules/invitations/components/invitations-list";
import { getAccesInvitation } from "@/modules/invitations/invitation.acces";
import { listInvitations } from "@/modules/invitations/invitation.service";

export const metadata: Metadata = { title: "Invitations" };

export default async function MesInvitationsPage() {
  const user = await requireArea("espace-client");
  const acces = await getAccesInvitation(user.id);
  const debloque = acces.etat === "DEBLOQUE";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description={debloque ? "Create, animate and share your invitation cards, for every celebration." : "Design your own invitation cards with our online editor: weddings, birthdays, graduations and more."}
      />
      {debloque ? <InvitationsList invitations={await listInvitations(user)} /> : <InvitationLock acces={acces} />}
    </div>
  );
}
