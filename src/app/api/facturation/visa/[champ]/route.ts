/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { CHAMPS_VISA, type ChampVisa } from "@/modules/facturation/facturation.types";
import { readVisaImage } from "@/modules/facturation/visa.service";

/** The studio signature or stamp, shown to the admin on their profile. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/facturation/visa/[champ]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const { champ } = await ctx.params;
  if (!(CHAMPS_VISA as readonly string[]).includes(champ)) return new Response("Not found", { status: 404 });
  const image = await readVisaImage(champ as ChampVisa, user);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Blob([image as BlobPart], { type: "image/png" }), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
