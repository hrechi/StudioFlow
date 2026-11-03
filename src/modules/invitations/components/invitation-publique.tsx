"use client";

import type { ContenuInvitation } from "../invitation.schema";
import { InvitationApercu } from "./invitation-apercu";

/** The card a guest opens from the shared link, as large as the screen allows. */
export function InvitationPublique({ contenu }: { contenu: ContenuInvitation }) {
  const { width, height } = contenu.size;
  return (
    <div style={{ width: `min(100%, ${width * 1.4}px, calc((100dvh - 4rem) * ${width / height}))` }}>
      <InvitationApercu contenu={contenu} className="w-full overflow-hidden rounded-sm shadow-xl" />
    </div>
  );
}
