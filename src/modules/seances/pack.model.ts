import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import { STATUTS_PACK, type StatutPack } from "./catalogue.types";

/** Collection `packs` (cahier §3.3). Lines and options are embedded: they belong to one pack. */
export interface IPackLigne {
  prestation: Types.ObjectId;
  quantite: number;
  conditions?: string;
}

export interface IPackOption {
  nom: string;
  prix: number;
  description?: string;
}

export interface IPack {
  nom: string;
  typeEvenement: Types.ObjectId;
  description: string;
  prix: number; // TND
  afficherPrix: boolean;
  dureeEstimeeMinutes: number; // 0 = not specified
  prestations: IPackLigne[];
  options: IPackOption[];
  statut: StatutPack;
  /** Mis en avant sur le site vitrine (homepage, recommandations chatbot). */
  miseEnAvant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PackDocument = HydratedDocument<IPack>;

const ligneSchema = new Schema<IPackLigne>(
  {
    prestation: { type: Schema.Types.ObjectId, ref: "Prestation", required: true },
    quantite: { type: Number, required: true, min: 1 },
    conditions: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const optionSchema = new Schema<IPackOption>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    prix: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const packSchema = new Schema<IPack>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    typeEvenement: { type: Schema.Types.ObjectId, ref: "TypeEvenement", required: true },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    prix: { type: Number, required: true, min: 0 },
    afficherPrix: { type: Boolean, default: true },
    dureeEstimeeMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    miseEnAvant: { type: Boolean, default: false },
    prestations: { type: [ligneSchema], default: [] },
    options: { type: [optionSchema], default: [] },
    statut: { type: String, enum: STATUTS_PACK, default: "BROUILLON", required: true },
  },
  { timestamps: true, collection: "packs" },
);

// A pack name is unique inside its event type (case-insensitive).
packSchema.index(
  { typeEvenement: 1, nom: 1 },
  { unique: true, collation: { locale: "fr", strength: 1 } },
);
packSchema.index({ statut: 1, typeEvenement: 1 });
packSchema.index({ "prestations.prestation": 1 });

export const Pack: Model<IPack> =
  (models.Pack as Model<IPack> | undefined) ?? model<IPack>("Pack", packSchema);
