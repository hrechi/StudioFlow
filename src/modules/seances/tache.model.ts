import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import { PHASES, PRIORITES, STATUTS_TACHE, type Phase, type Priorite, type StatutTache } from "./tache.dto";

export interface ITache {
  seance: Types.ObjectId;
  titre: string;
  description?: string;
  employe?: Types.ObjectId;
  dateLimite?: Date;
  priorite: Priorite;
  phase: Phase;
  statut: StatutTache;
  createdAt: Date;
  updatedAt: Date;
}

export type TacheDocument = HydratedDocument<ITache>;

const tacheSchema = new Schema<ITache>(
  {
    seance: { type: Schema.Types.ObjectId, ref: "Seance", required: true, index: true },
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    employe: { type: Schema.Types.ObjectId, ref: "Utilisateur" },
    dateLimite: { type: Date },
    priorite: { type: String, enum: PRIORITES, default: "NORMALE", required: true },
    phase: { type: String, enum: PHASES, default: "AVANT", required: true },
    statut: { type: String, enum: STATUTS_TACHE, default: "A_FAIRE", required: true },
  },
  { timestamps: true, collection: "taches" },
);

tacheSchema.index({ employe: 1, statut: 1 });
tacheSchema.index({ statut: 1, dateLimite: 1 });

export const Tache: Model<ITache> =
  (models.Tache as Model<ITache> | undefined) ?? model<ITache>("Tache", tacheSchema);
