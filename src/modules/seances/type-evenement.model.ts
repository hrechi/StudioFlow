import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";
import { PACKS_MAX_DEFAUT, PACKS_MAX_PLAFOND } from "./catalogue.types";

/** Collection `types_evenement` (cahier §3.2). */
export interface ITypeEvenement {
  nom: string;
  slug: string; // stable public identifier (showcase categories); kept on rename
  description?: string;
  actif: boolean;
  maxPacks: number; // maximum number of packs allowed for this type
  /**
   * Number of packs currently in this type. Maintained atomically by the pack
   * service (reserveSlot / releaseSlot) so the cap holds even under concurrent requests.
   */
  packsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TypeEvenementDocument = HydratedDocument<ITypeEvenement>;

const typeEvenementSchema = new Schema<ITypeEvenement>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 500 },
    actif: { type: Boolean, default: true },
    maxPacks: { type: Number, required: true, default: PACKS_MAX_DEFAUT, min: 1, max: PACKS_MAX_PLAFOND },
    packsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "types_evenement" },
);

// Case/accent-insensitive uniqueness of the name ("Henna" = "henna").
typeEvenementSchema.index({ nom: 1 }, { unique: true, collation: { locale: "fr", strength: 1 } });

export const TypeEvenement: Model<ITypeEvenement> =
  (models.TypeEvenement as Model<ITypeEvenement> | undefined) ??
  model<ITypeEvenement>("TypeEvenement", typeEvenementSchema);
