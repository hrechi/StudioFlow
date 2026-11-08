"use client";

import type { ContenuInvitation } from "../invitation.schema";
import { InvitationAnimee } from "./invitation-animee";

/**
 * The card a guest opens from the shared link, as large as the screen allows: opening scene,
 * animations, ambiance and music when the card has them, the still card otherwise.
 */
export function InvitationPublique({ contenu, titre = "Invitation", musique = null }: { contenu: ContenuInvitation; titre?: string; musique?: string | null }) {
  return <InvitationAnimee contenu={contenu} titre={titre} musique={musique} />;
}
