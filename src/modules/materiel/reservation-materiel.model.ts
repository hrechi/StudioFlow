/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import { STATUTS_RESERVATION, type StatutReservation } from "./materiel.types";

export interface IReservationMateriel {
  materiel: Types.ObjectId;
  /** Séance id (today in `seances_demo`, later in the Séances module). */
  seance: Types.ObjectId;
  /** Copies taken at booking time: the history stays readable and feeds the future AI kit. */
  seanceTitre: string;
  typeEvenement: string;
  /** Who made the reservation. */
  utilisateur: Types.ObjectId;
  dateDebut: Date;
  dateFin: Date;
  statut: StatutReservation;
  remarqueRetour?: string;
  seed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationMaterielDocument = HydratedDocument<IReservationMateriel>;

const reservationMaterielSchema = new Schema<IReservationMateriel>(
  {
    materiel: { type: Schema.Types.ObjectId, ref: "Materiel", required: true },
    // No `ref`: today a `seances_demo` id, later a real `seances` id (see seance-source.ts).
    seance: { type: Schema.Types.ObjectId, required: true },
    seanceTitre: { type: String, required: true, trim: true, maxlength: 120 },
    typeEvenement: { type: String, required: true, trim: true, maxlength: 60 },
    utilisateur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    statut: { type: String, enum: STATUTS_RESERVATION, default: "EN_ATTENTE", required: true },
    remarqueRetour: { type: String, trim: true, maxlength: 500 },
    seed: { type: Boolean, default: false, required: true },
  },
  { timestamps: true, collection: "reservations_materiel" },
);

// Conflict detection: reservations of one item that cross a period.
reservationMaterielSchema.index({ materiel: 1, dateDebut: 1, dateFin: 1 });
reservationMaterielSchema.index({ utilisateur: 1, dateDebut: 1 });
reservationMaterielSchema.index({ seance: 1 });

export const ReservationMateriel: Model<IReservationMateriel> =
  (models.ReservationMateriel as Model<IReservationMateriel> | undefined) ??
  model<IReservationMateriel>("ReservationMateriel", reservationMaterielSchema);
