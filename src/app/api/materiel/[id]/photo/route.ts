import { NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import {
  removeMaterielPhoto,
  replaceMaterielPhoto,
} from "@/modules/materiel/materiel-photo.service";
import { MATERIEL_PHOTO_MAX_BYTES } from "@/modules/materiel/materiel-photo.processing";

async function adminOnly() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  if (!can(user.role, "materiel") || user.role !== "ADMIN") {
    return NextResponse.json(failure("Only an administrator can manage equipment photos."), {
      status: 403,
    });
  }
  return user;
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/materiel/[id]/photo">) {
  const user = await adminOnly();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid upload."), { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(failure("Choose an image file."), { status: 400 });
  }
  if (file.size > MATERIEL_PHOTO_MAX_BYTES) {
    return NextResponse.json(failure("The image must be 5 MB or smaller."), { status: 400 });
  }
  try {
    await replaceMaterielPhoto(id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(success(), { status: 201 });
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/materiel/[id]/photo">) {
  const user = await adminOnly();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  try {
    await removeMaterielPhoto(id);
    return NextResponse.json(success());
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
