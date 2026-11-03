/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { revalidatePath } from "next/cache";
import { after, NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { uploadPhoto } from "@/modules/photos-galeries/photo.service";
import { analysePhoto } from "@/modules/photos-galeries/photo-ai.service";

/**
 * POST multipart/form-data { galerieId, file } — one photo per request so the
 * dialog can show per-file progress. A Route Handler (not a Server Action)
 * because Server Actions cap request bodies at 1 MB.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  if (!can(user.role, "photos-galeries")) {
    return NextResponse.json(failure("You are not allowed to import photos."), { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid upload."), { status: 400 });
  }
  const galerieId = form.get("galerieId");
  const file = form.get("file");
  if (typeof galerieId !== "string" || !(file instanceof File)) {
    return NextResponse.json(failure("Choose a gallery and a file."), { status: 400 });
  }

  try {
    const photo = await uploadPhoto(
      galerieId,
      {
        name: file.name,
        type: file.type,
        size: file.size,
        data: Buffer.from(await file.arrayBuffer()),
      },
      user.id,
    );
    revalidatePath("/dashboard/photos", "layout");
    revalidatePath("/dashboard/galeries", "layout");
    // AI analysis (Claude Haiku) once the response is sent: the upload never waits for it.
    after(() => analysePhoto(photo.id));
    return NextResponse.json(success({ id: photo.id }), { status: 201 });
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
