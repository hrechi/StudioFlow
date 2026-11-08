import { Schema, model, models, type Model, type Types } from "mongoose";
import type { ContenuInvitation } from "./invitation.schema";
import { PRIX_HT_PAR_DEFAUT, TVA_INVITATION_PAR_DEFAUT } from "./invitation.types";

export interface IInvitation {
  client: Types.ObjectId;
  titre: string;
  /** Validated by contenuSchema before every write: Zod is the source of truth, not Mongoose. */
  contenu: ContenuInvitation;
  partage?: { token: string; actif: boolean };
  /** Link preview picture (GridFS `imagesInvitations`), made by the editor when the card is shared. */
  apercu?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  client: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true, index: true },
  titre: { type: String, required: true, trim: true, maxlength: 80 },
  contenu: { type: Schema.Types.Mixed, required: true },
  partage: {
    type: new Schema({
      token: { type: String, required: true },
      actif: { type: Boolean, required: true, default: false },
    }, { _id: false }),
  },
  apercu: { type: Schema.Types.ObjectId },
}, { timestamps: true, collection: "invitations", minimize: false });

invitationSchema.index({ "partage.token": 1 }, { unique: true, sparse: true });

export const Invitation: Model<IInvitation> =
  (models.Invitation as Model<IInvitation> | undefined) ?? model<IInvitation>("Invitation", invitationSchema);

/** Collection `parametres_invitations`: one document (cle = "default"). No document = the defaults. */
export interface IParametresInvitation {
  cle: string;
  prixHT: number; // millimes
  tva: number;
}

const parametresSchema = new Schema<IParametresInvitation>({
  cle: { type: String, required: true, unique: true, default: "default" },
  prixHT: { type: Number, required: true, min: 1, validate: Number.isInteger, default: PRIX_HT_PAR_DEFAUT * 1000 },
  tva: { type: Number, required: true, min: 0, max: 100, default: TVA_INVITATION_PAR_DEFAUT },
}, { timestamps: true, collection: "parametres_invitations" });

export const ParametresInvitation: Model<IParametresInvitation> =
  (models.ParametresInvitation as Model<IParametresInvitation> | undefined) ??
  model<IParametresInvitation>("ParametresInvitation", parametresSchema);
