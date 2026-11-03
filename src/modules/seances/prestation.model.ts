import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

/** Collection `prestations`: configurable service catalogue (no code change to add one). */
export interface IPrestation {
  nom: string;
  description?: string;
  unite?: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PrestationDocument = HydratedDocument<IPrestation>;

const prestationSchema = new Schema<IPrestation>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    unite: { type: String, trim: true, maxlength: 30 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "prestations" },
);

prestationSchema.index({ nom: 1 }, { unique: true, collation: { locale: "fr", strength: 1 } });

export const Prestation: Model<IPrestation> =
  (models.Prestation as Model<IPrestation> | undefined) ??
  model<IPrestation>("Prestation", prestationSchema);
