/* Module : Gestion des Invitations */
import { NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { uploadImage } from "@/modules/invitations/invitation.service";

/** POST multipart/form-data { image }. A Route Handler because Server Actions cap bodies at 1 MB. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid form."), { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json(failure("Choose an image."), { status: 400 });

  try {
    const image = await uploadImage({ type: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) }, user);
    return NextResponse.json(success(image));
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
