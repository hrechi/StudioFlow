import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CRITERES_METEO,
  STATUTS_ALERTE_METEO,
  TYPES_DECISION_METEO,
  type CritereMeteo,
  type StatutAlerteMeteo,
  type TypeDecisionMeteo,
} from "./meteo.types";

/**
 * Collection `alertes_meteo`: a session whose forecast crosses a threshold. Title, dates and place
 * are copied so the history stays readable after the session moves. An alert never changes the
 * session by itself: only the admin's explicit decision does (see meteo.service.ts).
 */
export interface IAlerteMeteo {
  seance: Types.ObjectId;
  lieu: Types.ObjectId;
  seanceTitre: string;
  lieuNom: string;
  dateDebut: Date;
  dateFin: Date;
  resume: {
    probabilitePluiePct: number | null;
    pluieMm: number | null;
    ventKmh: number | null;
    temperatureMinC: number | null;
    temperatureMaxC: number | null;
  };
  depassements: { critere: CritereMeteo; valeur: number; seuil: number }[];
  statut: StatutAlerteMeteo;
  decision?: { type: TypeDecisionMeteo; par: Types.ObjectId; le: Date; detail: string };
  verifieLe: Date;
  createdAt: Date;
  updatedAt: Date;
}

const nullableNumber = { type: Number, default: null };

const alerteMeteoSchema = new Schema<IAlerteMeteo>(
  {
    seance: { type: Schema.Types.ObjectId, ref: "Seance", required: true, index: true },
    lieu: { type: Schema.Types.ObjectId, ref: "Lieu", required: true },
    seanceTitre: { type: String, required: true, maxlength: 120 },
    lieuNom: { type: String, required: true, maxlength: 80 },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    resume: {
      probabilitePluiePct: nullableNumber,
      pluieMm: nullableNumber,
      ventKmh: nullableNumber,
      temperatureMinC: nullableNumber,
      temperatureMaxC: nullableNumber,
    },
    depassements: {
      type: [
        new Schema(
          {
            critere: { type: String, enum: CRITERES_METEO, required: true },
            valeur: { type: Number, required: true },
            seuil: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    statut: { type: String, enum: STATUTS_ALERTE_METEO, default: "OUVERTE", required: true },
    decision: {
      type: new Schema(
        {
          type: { type: String, enum: TYPES_DECISION_METEO, required: true },
          par: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
          le: { type: Date, required: true },
          detail: { type: String, required: true, maxlength: 300 },
        },
        { _id: false },
      ),
    },
    verifieLe: { type: Date, required: true },
  },
  { timestamps: true, collection: "alertes_meteo" },
);

// At most one open alert per session (a second check updates it instead of duplicating it).
alerteMeteoSchema.index(
  { seance: 1 },
  { unique: true, partialFilterExpression: { statut: "OUVERTE" }, name: "seance_ouverte_unique" },
);
alerteMeteoSchema.index({ statut: 1, dateDebut: 1 });

export const AlerteMeteo: Model<IAlerteMeteo> =
  (models.AlerteMeteo as Model<IAlerteMeteo> | undefined) ??
  model<IAlerteMeteo>("AlerteMeteo", alerteMeteoSchema);
