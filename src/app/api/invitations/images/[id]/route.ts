/* Module : Gestion des Invitations */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { openImage } from "@/modules/invitations/invitation.service";

/** An uploaded image, for its owner or for guests once it sits on a shared card (no sign-in). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/invitations/images/[id]">) {
  const { id } = await ctx.params;
  const image = await openImage(id, await getCurrentUser());
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.stream, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
