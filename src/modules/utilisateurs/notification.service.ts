import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Notification, type INotification } from "./notification.model";
import type { NotificationDTO, TypeNotification } from "./utilisateur.types";

/**
 * Notifications service — the entry point other modules use to notify a user:
 *   await createNotification({ utilisateurId, titre, message, type: "SEANCE", lienCible })
 */

type NotificationLean = INotification & { _id: Types.ObjectId };

function toNotificationDTO(doc: NotificationLean): NotificationDTO {
  return {
    id: doc._id.toString(),
    titre: doc.titre,
    message: doc.message,
    type: doc.type,
    estLue: doc.estLue,
    lienCible: doc.lienCible,
    createdAt: doc.createdAt.toISOString(),
  };
}

export type CreateNotificationInput = {
  utilisateurId: string;
  titre: string;
  message: string;
  type: TypeNotification;
  lienCible?: string;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await connectDB();
  await Notification.create({
    utilisateur: new Types.ObjectId(input.utilisateurId),
    titre: input.titre,
    message: input.message,
    type: input.type,
    lienCible: input.lienCible,
  });
}

export async function listNotifications(
  utilisateurId: string,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<{ items: NotificationDTO[]; total: number; page: number; pageCount: number }> {
  await connectDB();
  const filter = { utilisateur: new Types.ObjectId(utilisateurId) };
  const [docs, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<NotificationLean[]>(),
    Notification.countDocuments(filter),
  ]);
  return {
    items: docs.map(toNotificationDTO),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Data for the top-bar bell: latest notifications + unread count. */
export async function getNotificationSummary(
  utilisateurId: string,
  limit = 5,
): Promise<{ latest: NotificationDTO[]; unread: number }> {
  await connectDB();
  const utilisateur = new Types.ObjectId(utilisateurId);
  const [docs, unread] = await Promise.all([
    Notification.find({ utilisateur })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<NotificationLean[]>(),
    Notification.countDocuments({ utilisateur, estLue: false }),
  ]);
  return { latest: docs.map(toNotificationDTO), unread };
}

export async function markAllAsRead(utilisateurId: string): Promise<void> {
  await connectDB();
  await Notification.updateMany(
    { utilisateur: new Types.ObjectId(utilisateurId), estLue: false },
    { $set: { estLue: true } },
  );
}

export async function markAsRead(utilisateurId: string, notificationId: string): Promise<void> {
  if (!Types.ObjectId.isValid(notificationId)) return;
  await connectDB();
  // Scoped by owner: a user can only mark their own notifications.
  await Notification.updateOne(
    { _id: new Types.ObjectId(notificationId), utilisateur: new Types.ObjectId(utilisateurId) },
    { $set: { estLue: true } },
  );
}

export async function deleteNotificationsOf(utilisateurId: string): Promise<void> {
  await connectDB();
  await Notification.deleteMany({ utilisateur: new Types.ObjectId(utilisateurId) });
}
