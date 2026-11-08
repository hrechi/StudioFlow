/* Module : Gestion des Invitations */
import { NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { saveApercu } from "@/modules/invitations/invitation.service";

/** POST multipart/form-data { image: PNG }: the link preview of a shared card, sent by the editor. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/invitations/[id]/apercu">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{24}$/.test(id)) return NextResponse.json(failure("Invitation not found."), { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid form."), { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json(failure("Choose an image."), { status: 400 });

  try {
    await saveApercu(id, { type: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) }, user);
    return NextResponse.json(success());
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
