import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { getMaterielPhoto } from "@/modules/materiel/materiel-photo.service";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/materiel/photo/[fileId]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!can(user.role, "materiel")) return new Response("Not found", { status: 404 });
  const { fileId } = await ctx.params;
  const access = await getMaterielPhoto(fileId);
  if (!access) {
    console.warn("[materiel-photo] File is not linked to an equipment record.", { fileId });
    return new Response("Not found", { status: 404 });
  }
  if (!access.file) {
    console.warn("[materiel-photo] GridFS file is missing.", { fileId });
    return new Response("Not found", { status: 404 });
  }
  const etag = `"materiel-${fileId}-${access.file.length}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(access.file.stream, {
    headers: {
      "Content-Type": access.file.contentType,
      "Content-Length": String(access.file.length),
      "Cache-Control": "private, max-age=300",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
