"use server";

import { revalidatePath } from "next/cache";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/guards";
import { objectIdSchema } from "./catalogue.schemas";
import { reservationSchema } from "./reservation.schemas";
import { cancelOwnRequest, createReservationRequest } from "./seance.service";

export async function createReservationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("CLIENT");
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const created = await createReservationRequest(user.id, parsed.data);
    revalidatePath("/espace-client/seances");
    revalidatePath("/dashboard/seances", "layout");
    return success(created);
  } catch (error) {
    return toFailure(error);
  }
}

export async function cancelReservationAction(id: string): Promise<ActionResult> {
  const user = await requireRole("CLIENT");
  const parsedId = objectIdSchema("Session").safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  try {
    await cancelOwnRequest(parsedId.data, user.id);
    revalidatePath("/espace-client/seances");
    revalidatePath("/dashboard/seances", "layout");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
