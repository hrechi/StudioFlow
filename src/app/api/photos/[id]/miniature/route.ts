/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { NextRequest } from "next/server";
import { photoFileResponse } from "@/modules/photos-galeries/photo-file-response";

/** WebP thumbnail, streamed from GridFS. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/photos/[id]/miniature">) {
  const { id } = await ctx.params;
  return photoFileResponse(id, "miniature");
}
