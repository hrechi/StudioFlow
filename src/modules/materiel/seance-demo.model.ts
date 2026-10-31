/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 *
 * STAND-IN TEMPORAIRE en attendant l'intégration avec le module Séances.
 * Collection `seances_demo`, propre au module Matériel : elle n'est lue que par
 * `seance-source.ts` et remplie par `scripts/seed-materiel.ts`. Quand les réservations
 * seront branchées sur le vrai service Séances, ce fichier et la collection disparaîtront.
 */
import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";

/** Same values as the real séance statuses, so switching to the Séances module is painless. */
export const STATUTS_SEANCE_DEMO = [
  "DEMANDE_RECUE",
  "EN_ATTENTE_CONFIRMATION",
  "CONFIRMEE",
  "EN_COURS",
  "TERMINEE",
  "REPORTEE",
  "ANNULEE",
] as const;
export type StatutSeanceDemo = (typeof STATUTS_SEANCE_DEMO)[number];

export interface ISeanceDemo {
  titre: string;
  typeEvenement: string;
  lieu: string;
  dateDebut: Date;
  dateFin: Date;
  statut: StatutSeanceDemo;
  client?: Types.ObjectId;
  clientNom: string;
  photographe?: Types.ObjectId;
  seed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SeanceDemoDocument = HydratedDocument<ISeanceDemo>;

const seanceDemoSchema = new Schema<ISeanceDemo>(
  {
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    typeEvenement: { type: String, required: true, trim: true, maxlength: 60 },
    lieu: { type: String, required: true, trim: true, maxlength: 200 },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    statut: { type: String, enum: STATUTS_SEANCE_DEMO, default: "CONFIRMEE", required: true },
    client: { type: Schema.Types.ObjectId, ref: "Utilisateur" },
    clientNom: { type: String, required: true, trim: true, maxlength: 120 },
    photographe: { type: Schema.Types.ObjectId, ref: "Utilisateur" },
    seed: { type: Boolean, default: false, required: true },
  },
  { timestamps: true, collection: "seances_demo" },
);

seanceDemoSchema.index({ dateDebut: 1, dateFin: 1 });

export const SeanceDemo: Model<ISeanceDemo> =
  (models.SeanceDemo as Model<ISeanceDemo> | undefined) ??
  model<ISeanceDemo>("SeanceDemo", seanceDemoSchema);
