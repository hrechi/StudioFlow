import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  ROLES_EQUIPE,
  STATUTS_SEANCE_REEL,
  type RoleEquipe,
  type StatutSeanceReel,
} from "./seance.dto";

export interface ISeance {
  titre: string;
  client?: Types.ObjectId;
  clientExterne?: { nom: string; telephone: string; email?: string };
  typeEvenement: Types.ObjectId;
  pack?: Types.ObjectId;
  prestationPersonnalisee?: string;
  dateDebut: Date;
  dateFin: Date;
  lieu: string;
  /** Link to a configured location (weather, alternatives, availability). Optional. */
  lieuId?: Types.ObjectId;
  statut: StatutSeanceReel;
  equipe: { employe: Types.ObjectId; role: RoleEquipe }[];
  notes?: string;
  messageClient?: string;
  /** Prix final réel convenu avec le client (peut différer du prix du pack). */
  prixFinal?: number;
  /** How many times the date was moved. Statistics only. */
  nombreReports?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SeanceDocument = HydratedDocument<ISeance>;

const seanceSchema = new Schema<ISeance>(
  {
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    client: { type: Schema.Types.ObjectId, ref: "Utilisateur", index: true },
    clientExterne: {
      type: new Schema(
        {
          nom: { type: String, required: true, trim: true, maxlength: 80 },
          telephone: { type: String, required: true, trim: true, maxlength: 30 },
          email: { type: String, trim: true, lowercase: true, maxlength: 120 },
        },
        { _id: false },
      ),
    },
    typeEvenement: { type: Schema.Types.ObjectId, ref: "TypeEvenement", required: true },
    pack: { type: Schema.Types.ObjectId, ref: "Pack" },
    prestationPersonnalisee: { type: String, trim: true, maxlength: 500 },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    lieu: { type: String, required: true, trim: true, maxlength: 200 },
    lieuId: { type: Schema.Types.ObjectId, ref: "Lieu" },
    statut: { type: String, enum: STATUTS_SEANCE_REEL, default: "DEMANDE_RECUE", required: true },
    equipe: {
      type: [
        {
          _id: false,
          employe: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
          role: { type: String, enum: ROLES_EQUIPE, required: true },
        },
      ],
      default: [],
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    messageClient: { type: String, trim: true, maxlength: 500 },
    prixFinal: { type: Number, min: 0 },
    nombreReports: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, collection: "seances" },
);

seanceSchema.index({ dateDebut: 1, dateFin: 1 });
seanceSchema.index({ "equipe.employe": 1, dateDebut: 1 });
seanceSchema.index({ pack: 1 });
seanceSchema.index({ typeEvenement: 1 });
seanceSchema.index({ lieuId: 1, dateDebut: 1 });

export const Seance: Model<ISeance> =
  (models.Seance as Model<ISeance> | undefined) ?? model<ISeance>("Seance", seanceSchema);
