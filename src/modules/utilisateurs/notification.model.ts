import { Schema, Types, model, models, type Model } from "mongoose";
import { TYPES_NOTIFICATION, type TypeNotification } from "./utilisateur.types";

/** Collection `notifications` (cahier §4.3 — class Notification). */
export interface INotification {
  utilisateur: Types.ObjectId;
  titre: string;
  message: string;
  type: TypeNotification;
  estLue: boolean;
  lienCible?: string;
  createdAt: Date; // = dateEnvoi
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    utilisateur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: TYPES_NOTIFICATION, default: "SYSTEME", required: true },
    estLue: { type: Boolean, default: false },
    lienCible: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, collection: "notifications" },
);

notificationSchema.index({ utilisateur: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification> | undefined) ??
  model<INotification>("Notification", notificationSchema);
