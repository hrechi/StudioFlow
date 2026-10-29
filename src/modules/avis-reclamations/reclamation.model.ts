import { Schema, Types, model, models, type Model } from "mongoose";
import { ROLES, type Role } from "@/modules/utilisateurs/utilisateur.types";
import {
  CATEGORIES_RECLAMATION,
  PRIORITES,
  STATUTS_RECLAMATION,
  type CategorieReclamation,
  type Priorite,
  type StatutReclamation,
} from "./avis.types";

/** One bubble of the client ↔ studio conversation that follows a complaint. */
export interface IReclamationMessage {
  _id: Types.ObjectId;
  auteur: Types.ObjectId;
  auteurRole: Role;
  contenu: string;
  createdAt: Date;
}

export interface IReclamation {
  auteur: Types.ObjectId;
  objet: string;
  description: string;
  categorie: CategorieReclamation;
  categorieIA: CategorieReclamation;
  priorite: Priorite;
  statut: StatutReclamation;
  seance?: Types.ObjectId;
  seanceTitre?: string;
  reponse?: string;
  dateReponse?: Date;
  dateResolution?: Date;
  traitePar?: Types.ObjectId;
  messages: IReclamationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IReclamationMessage>(
  {
    auteur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    auteurRole: { type: String, enum: ROLES, required: true },
    contenu: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: true },
);

const reclamationSchema = new Schema<IReclamation>(
  {
    auteur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    objet: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    categorie: { type: String, enum: CATEGORIES_RECLAMATION, required: true },
    categorieIA: { type: String, enum: CATEGORIES_RECLAMATION, default: "AUTRE", required: true },
    priorite: { type: String, enum: PRIORITES, default: "MOYENNE", required: true },
    statut: { type: String, enum: STATUTS_RECLAMATION, default: "OUVERTE", required: true },
    seance: { type: Schema.Types.ObjectId, ref: "Seance" },
    seanceTitre: { type: String, trim: true, maxlength: 200 },
    reponse: { type: String, trim: true, maxlength: 5000 },
    dateReponse: { type: Date },
    dateResolution: { type: Date },
    traitePar: { type: Schema.Types.ObjectId, ref: "Utilisateur" },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true, collection: "reclamations" },
);

reclamationSchema.index({ statut: 1, priorite: 1, createdAt: -1 });
reclamationSchema.index({ auteur: 1, createdAt: -1 });

export const Reclamation: Model<IReclamation> =
  (models.Reclamation as Model<IReclamation> | undefined) ??
  model<IReclamation>("Reclamation", reclamationSchema);
