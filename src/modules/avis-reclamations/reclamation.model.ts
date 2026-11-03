import { Schema, Types, model, models, type Model } from "mongoose";
import { ROLES, type Role } from "@/modules/utilisateurs/utilisateur.types";
import {
  CATEGORIES_RECLAMATION,
  EVENEMENTS_RECLAMATION,
  PRIORITES,
  SENTIMENTS,
  STATUTS_RECLAMATION,
  type CategorieReclamation,
  type EvenementReclamation,
  type Priorite,
  type Sentiment,
  type StatutReclamation,
} from "./avis.types";

/** One bubble of the client ↔ studio conversation that follows a complaint. */
export interface IReclamationMessage {
  _id: Types.ObjectId;
  auteur: Types.ObjectId;
  auteurRole: Role;
  contenu: string;
  createdAt: Date;
  evenement?: EvenementReclamation;
  sentimentIA?: Sentiment;
  scoreFrustrationIA?: number; // 0–1
}

export interface IResumeReclamation {
  demande: string;
  engagements: string;
  enSuspens: string;
  dateGeneration: Date;
  nbMessages: number;
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
  satisfaction?: { satisfait: boolean; date: Date };
  nombreReouvertures: number;
  escaladeIA?: Date;
  resumeIA?: IResumeReclamation;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IReclamationMessage>(
  {
    auteur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    auteurRole: { type: String, enum: ROLES, required: true },
    contenu: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now, required: true },
    evenement: { type: String, enum: EVENEMENTS_RECLAMATION },
    sentimentIA: { type: String, enum: SENTIMENTS },
    scoreFrustrationIA: { type: Number, min: 0, max: 1 },
  },
  { _id: true },
);

const resumeSchema = new Schema<IResumeReclamation>(
  {
    demande: { type: String, required: true, maxlength: 600 },
    engagements: { type: String, required: true, maxlength: 600 },
    enSuspens: { type: String, required: true, maxlength: 600 },
    dateGeneration: { type: Date, required: true },
    nbMessages: { type: Number, required: true },
  },
  { _id: false },
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
    satisfaction: {
      type: new Schema(
        { satisfait: { type: Boolean, required: true }, date: { type: Date, required: true } },
        { _id: false },
      ),
    },
    nombreReouvertures: { type: Number, default: 0, min: 0 },
    escaladeIA: { type: Date },
    resumeIA: { type: resumeSchema },
  },
  { timestamps: true, collection: "reclamations" },
);

reclamationSchema.index({ statut: 1, priorite: 1, createdAt: -1 });
reclamationSchema.index({ auteur: 1, createdAt: -1 });

export const Reclamation: Model<IReclamation> =
  (models.Reclamation as Model<IReclamation> | undefined) ??
  model<IReclamation>("Reclamation", reclamationSchema);
