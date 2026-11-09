"use server";

import { revalidatePath } from "next/cache";
import { success, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/guards";
import { setTutorialEnabled } from "@/modules/utilisateurs/utilisateur.service";

/** Profile switch: turns the guided tour on (it then shows again) or off. */
export async function setTutorialEnabledAction(enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  await setTutorialEnabled(user.id, enabled === true);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/espace-client", "layout");
  return success();
}

/** The tour was finished or skipped: it switches itself off until turned back on. */
export async function endTutorialAction(): Promise<ActionResult> {
  const user = await requireUser();
  await setTutorialEnabled(user.id, false);
  return success();
}
