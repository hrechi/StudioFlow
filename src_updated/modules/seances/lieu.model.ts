import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import { LIEUX_ALTERNATIFS_MAX, TYPES_LIEU, type TypeLieu } from "./lieu.types";

/** Collection `lieux` (cahier §3.12). */
export interface ILieu {
  nom: string;
  adresse: string;
  description?: string;
  type: TypeLieu;
  exterieur: boolean;
  capacite: number;
  disponible: boolean;
  latitude?: number;
  longitude?: number;
  coutSupplementaire: number;
  lieuxAlternatifs: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type LieuDocument = HydratedDocument<ILieu>;

const lieuSchema = new Schema<ILieu>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    adresse: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    type: { type: String, enum: TYPES_LIEU, required: true, default: "STUDIO" },
    exterieur: { type: Boolean, required: true, default: false },
    capacite: { type: Number, default: 0, min: 0, max: 10_000 },
    disponible: { type: Boolean, default: true },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    coutSupplementaire: { type: Number, default: 0, min: 0, max: 100_000 },
    lieuxAlternatifs: {
      type: [{ type: Schema.Types.ObjectId, ref: "Lieu" }],
      default: [],
      validate: {
        validator: (v: unknown[]) => v.length <= LIEUX_ALTERNATIFS_MAX,
        message: `${LIEUX_ALTERNATIFS_MAX} alternative locations maximum`,
      },
    },
  },
  { timestamps: true, collection: "lieux" },
);

// A location name is unique (case and accent insensitive).
lieuSchema.index({ nom: 1 }, { unique: true, collation: { locale: "fr", strength: 1 } });

export const Lieu: Model<ILieu> =
  (models.Lieu as Model<ILieu> | undefined) ?? model<ILieu>("Lieu", lieuSchema);
