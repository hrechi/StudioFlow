/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { CHAMPS_VISA, type ChampVisa } from "@/modules/facturation/facturation.types";
import { setVisaImage } from "@/modules/facturation/visa.service";

/**
 * The admin adds or replaces the studio signature or company stamp.
 * POST multipart/form-data { champ: "signature" | "cachet", image }
 * A Route Handler (not a Server Action) because Server Actions cap request bodies at 1 MB.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json(failure("Only administrators can manage the studio signature and stamp."), { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid form."), { status: 400 });
  }
  const champ = form.get("champ");
  if (typeof champ !== "string" || !(CHAMPS_VISA as readonly string[]).includes(champ)) {
    return NextResponse.json(failure("Invalid form."), { status: 400 });
  }
  const image = form.get("image");
  const file = image instanceof File && image.size > 0
    ? { name: image.name, type: image.type, data: Buffer.from(await image.arrayBuffer()) }
    : null;

  try {
    await setVisaImage(champ as ChampVisa, file, user);
    revalidatePath("/dashboard/profil");
    return NextResponse.json(success(), { status: 201 });
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
