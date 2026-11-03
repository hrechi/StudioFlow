/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";
import {
  CATEGORIES_MATERIEL,
  ETATS_MATERIEL,
  type CategorieMateriel,
  type EtatMateriel,
} from "./materiel.types";

export interface IMateriel {
  nom: string;
  categorie: CategorieMateriel;
  marque: string;
  modele: string;
  numeroSerie: string;
  etat: EtatMateriel;
  dateAchat: Date;
  prix: number;
  disponible: boolean;
  photo?: string;
  archive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MaterielDocument = HydratedDocument<IMateriel>;

const materielSchema = new Schema<IMateriel>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    categorie: { type: String, enum: CATEGORIES_MATERIEL, required: true },
    marque: { type: String, required: true, trim: true, maxlength: 60 },
    modele: { type: String, required: true, trim: true, maxlength: 60 },
    numeroSerie: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    etat: { type: String, enum: ETATS_MATERIEL, default: "BON", required: true },
    dateAchat: { type: Date, required: true },
    prix: { type: Number, required: true, min: 0 },
    disponible: { type: Boolean, default: true, required: true },
    photo: { type: String, trim: true, maxlength: 500 },
    archive: { type: Boolean, default: false, required: true },
  },
  { timestamps: true, collection: "materiels" },
);

materielSchema.index({ archive: 1, nom: 1 });

export const Materiel: Model<IMateriel> =
  (models.Materiel as Model<IMateriel> | undefined) ?? model<IMateriel>("Materiel", materielSchema);
