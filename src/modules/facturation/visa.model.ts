import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * The studio's signature and company stamp: one document, saved once from the admin's profile and
 * printed on every quote and invoice PDF. The images are in GridFS bucket signaturesFactures.
 */
export interface IVisaStudio {
  cle: "STUDIO";
  signature?: Types.ObjectId;
  cachet?: Types.ObjectId;
  modifiePar: Types.ObjectId;
}

const visaStudioSchema = new Schema<IVisaStudio>({
  cle: { type: String, enum: ["STUDIO"], required: true, unique: true },
  signature: { type: Schema.Types.ObjectId },
  cachet: { type: Schema.Types.ObjectId },
  modifiePar: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
}, { timestamps: true, collection: "visaStudio" });

export const VisaStudio: Model<IVisaStudio> = (models.VisaStudio as Model<IVisaStudio> | undefined) ?? model<IVisaStudio>("VisaStudio", visaStudioSchema);
