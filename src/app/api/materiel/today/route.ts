/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { NextResponse, type NextRequest } from "next/server";
import { failure, toFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { getMaJournee } from "@/modules/materiel/journee.service";

/**
 * GET ?portee=moi|tous: "My day" as JSON, for the refresh, the app badge and the offline copy.
 * Never cached by the browser or the service worker (private data of the signed-in user).
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  if (!can(user.role, "materiel")) return NextResponse.json(failure("You do not have access to the equipment."), { status: 403 });
  const portee = request.nextUrl.searchParams.get("portee") === "tous" ? "tous" : "moi";
  try {
    return NextResponse.json(await getMaJournee(user, portee), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 500 });
  }
}
