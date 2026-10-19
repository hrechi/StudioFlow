/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { NextRequest } from "next/server";
import { photoFileResponse } from "@/modules/photos-galeries/photo-file-response";

/** Original photo, streamed from GridFS; `?download=1` sends it as an attachment. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/photos/[id]/file">) {
  const { id } = await ctx.params;
  return photoFileResponse(id, "file", request.nextUrl.searchParams.get("download") === "1");
}
