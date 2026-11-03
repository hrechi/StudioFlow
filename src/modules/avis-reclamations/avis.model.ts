import { Schema, Types, model, models, type HydratedDocument, type Model } from "mongoose";
import {
  CATEGORIES_MODERATION,
  SENTIMENTS,
  STATUTS_ANALYSE_IA,
  STATUTS_AVIS,
  TOPICS_AVIS,
  type CategorieModeration,
  type Sentiment,
  type StatutAnalyseIA,
  type StatutAvis,
  type TopicAvis,
} from "./avis.types";

export interface IAvis {
  auteur: Types.ObjectId;
  note: number;
  commentaire: string;
  seance?: Types.ObjectId;
  seanceTitre?: string;
  seanceType?: string;
  sentimentIA: Sentiment;
  scoreSentimentIA?: number;
  topicsIA: TopicAvis[];
  statutAnalyseIA: StatutAnalyseIA;
  dateAnalyseIA?: Date;
  modeleIA?: string;
  statut: StatutAvis;
  moderation: {
    statut: "EN_ATTENTE" | "SIGNALE" | "APPROUVE" | "REJETE";
    categories: CategorieModeration[];
    explication?: string;
    dateAnalyse?: Date;
    modeleIA?: string;
  };
  reponseStudio?: string;
  dateReponse?: Date;
  reponduPar?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const avisSchema = new Schema<IAvis>(
  {
    auteur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    note: { type: Number, required: true, min: 1, max: 5 },
    commentaire: { type: String, required: true, trim: true, maxlength: 3000 },
    seance: { type: Schema.Types.ObjectId, ref: "Seance" },
    seanceTitre: { type: String, trim: true, maxlength: 200 },
    seanceType: { type: String, trim: true, maxlength: 80 },
    sentimentIA: { type: String, enum: SENTIMENTS, default: "NEUTRE", required: true },
    scoreSentimentIA: { type: Number, min: 0, max: 1 },
    topicsIA: { type: [{ type: String, enum: TOPICS_AVIS }], default: [] },
    statutAnalyseIA: { type: String, enum: STATUTS_ANALYSE_IA, default: "EN_ATTENTE" },
    dateAnalyseIA: { type: Date },
    modeleIA: { type: String, trim: true, maxlength: 100 },
    statut: { type: String, enum: STATUTS_AVIS, default: "EN_ATTENTE", required: true },
    moderation: {
      statut: {
        type: String,
        enum: ["EN_ATTENTE", "SIGNALE", "APPROUVE", "REJETE"],
        default: "EN_ATTENTE",
      },
      categories: { type: [{ type: String, enum: CATEGORIES_MODERATION }], default: [] },
      explication: { type: String, trim: true, maxlength: 500 },
      dateAnalyse: { type: Date },
      modeleIA: { type: String, trim: true, maxlength: 100 },
    },
    reponseStudio: { type: String, trim: true, maxlength: 3000 },
    dateReponse: { type: Date },
    reponduPar: { type: Schema.Types.ObjectId, ref: "Utilisateur" },
  },
  { timestamps: true, collection: "avis" },
);

avisSchema.index({ statut: 1, createdAt: -1 });
avisSchema.index({ auteur: 1, createdAt: -1 });
avisSchema.index({ sentimentIA: 1, topicsIA: 1, createdAt: -1 });

export type AvisDocument = HydratedDocument<IAvis>;
export const Avis: Model<IAvis> =
  (models.Avis as Model<IAvis> | undefined) ?? model<IAvis>("Avis", avisSchema);
