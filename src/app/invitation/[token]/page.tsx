/* Module : Gestion des Invitations */
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvitationPublique } from "@/modules/invitations/components/invitation-publique";
import { configEvenement } from "@/modules/invitations/invitation.evenements";
import { formaterDate, valeurChamp } from "@/modules/invitations/invitation.linked";
import { musiquesDisponibles } from "@/modules/invitations/invitation.musique";
import { findInvitationPublique } from "@/modules/invitations/invitation.service";
import { apercuHref, MUSIQUES } from "@/modules/invitations/invitation.types";

type Props = { params: Promise<{ token: string }> };

/** Absolute address of this site as the guest reached it (link previews need absolute URLs). */
async function origine(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") || hote.startsWith("127.") ? "http" : "https");
  return `${protocole}://${hote}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const invitation = await findInvitationPublique(token);
  // A private link: it must never end up in a search engine.
  const robots = { index: false, follow: false };
  if (!invitation) return { title: "Invitation", robots };
  const { details } = invitation.contenu;
  const evenement = configEvenement(invitation.contenu.typeEvenement ?? "MARIAGE").label;
  const description = [formaterDate(details.date, details.langue), details.heure, details.lieu].filter(Boolean).join(" · ") || evenement;
  const base = await origine();
  const images = invitation.aApercu ? [{ url: `${base}${apercuHref(token)}`, width: 1200, height: 630, alt: invitation.titre }] : undefined;
  return {
    title: invitation.titre,
    description,
    robots,
    openGraph: { type: "website", title: invitation.titre, description, url: `${base}/invitation/${token}`, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: invitation.titre, description, images: images?.map((i) => i.url) },
  };
}

export default async function InvitationPubliquePage({ params }: Props) {
  const invitation = await findInvitationPublique((await params).token);
  if (!invitation) notFound();
  const { details, musique } = invitation.contenu;
  const fichierMusique = musique && musiquesDisponibles().includes(musique.piste) ? MUSIQUES[musique.piste].fichier : null;
  return (
    <main className="relative min-h-dvh overflow-hidden bg-muted/60">
      <h1 className="sr-only">{invitation.titre}</h1>
      {/* The card is a canvas: the same facts stay readable for screen readers. */}
      <ul className="sr-only">
        {(["titre", "noms", "date", "heure", "lieu", "message", "tenue", "contact"] as const).map((champ) =>
          champ === "titre" && !details.titre ? null : <li key={champ}>{valeurChamp(details, champ)}</li>,
        )}
      </ul>
      <InvitationPublique contenu={invitation.contenu} titre={invitation.titre} musique={fichierMusique} />
    </main>
  );
}
