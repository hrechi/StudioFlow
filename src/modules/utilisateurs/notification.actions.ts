"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/guards";
import { markAllAsRead, markAsRead } from "./notification.service";

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await markAllAsRead(user.id);
    revalidatePath("/", "layout");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await markAsRead(user.id, id);
    revalidatePath("/", "layout");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
