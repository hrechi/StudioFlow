/* Module : Gestion des Invitations */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationPublique } from "@/modules/invitations/components/invitation-publique";
import { valeurChamp } from "@/modules/invitations/invitation.linked";
import { findInvitationPublique } from "@/modules/invitations/invitation.service";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const invitation = await findInvitationPublique((await params).token);
  // A private link: it must never end up in a search engine.
  return { title: invitation?.titre ?? "Invitation", robots: { index: false, follow: false } };
}

export default async function InvitationPubliquePage({ params }: Props) {
  const invitation = await findInvitationPublique((await params).token);
  if (!invitation) notFound();
  const { details } = invitation.contenu;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/60 p-4 sm:p-8">
      <h1 className="sr-only">{invitation.titre}</h1>
      {/* The card is a canvas: the same facts stay readable for screen readers. */}
      <ul className="sr-only">
        {(["noms", "date", "heure", "lieu", "message"] as const).map((champ) => (
          <li key={champ}>{valeurChamp(details, champ)}</li>
        ))}
      </ul>
      <InvitationPublique contenu={invitation.contenu} />
    </main>
  );
}
