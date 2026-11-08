/* Module : Gestion des Invitations */
import type { NextRequest } from "next/server";
import { openApercu } from "@/modules/invitations/invitation.service";

/** Open Graph picture of a shared card: public (messaging apps fetch it without a session). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/invitations/apercu/[token]">) {
  const { token } = await ctx.params;
  const image = await openApercu(token);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(image.length),
      // Short cache: the picture changes when the card does, and stops when sharing is turned off.
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
