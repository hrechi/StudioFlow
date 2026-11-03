/* Module : Gestion des Invitations */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { NotFoundError, ValidationError } from "@/modules/facturation/devis.service";
import { InvitationEditor } from "@/modules/invitations/components/invitation-editor";
import { getAccesInvitation } from "@/modules/invitations/invitation.acces";
import { loadInvitation } from "@/modules/invitations/invitation.service";
import { CLIENT_PATH } from "@/modules/invitations/invitation.types";

export const metadata: Metadata = { title: "Invitation editor" };

export default async function InvitationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireArea("espace-client");
  const { id } = await params;
  const { etat } = await getAccesInvitation(user.id);
  if (etat !== "DEBLOQUE") redirect(CLIENT_PATH);
  const invitation = await loadInvitation(id, user).catch((error: unknown) => {
    if (error instanceof NotFoundError || error instanceof ValidationError) notFound();
    throw error;
  });
  return <InvitationEditor key={invitation.id} invitation={invitation} />;
}
