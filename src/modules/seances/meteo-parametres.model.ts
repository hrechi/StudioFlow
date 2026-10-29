import { Schema, model, models, type Model } from "mongoose";

/**
 * Collection `parametres_meteo`: one document (cle = "default") holding the thresholds and the
 * result of the last check. No document = the defaults of SEUILS_METEO_PAR_DEFAUT.
 */
export interface IMeteoParametres {
  cle: string;
  actif: boolean;
  pluieProbabiliteMax: number;
  pluieMmMax: number;
  ventKmhMax: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  horizonJours: number;
  derniereVerification?: {
    le: Date;
    seancesVerifiees: number;
    alertesCreees: number;
    alertesMisesAJour: number;
    alertesObsoletes: number;
    sansCoordonnees: number;
    erreurs: number;
  };
  updatedAt: Date;
}

const meteoParametresSchema = new Schema<IMeteoParametres>(
  {
    cle: { type: String, required: true, unique: true, default: "default" },
    actif: { type: Boolean, required: true, default: true },
    pluieProbabiliteMax: { type: Number, required: true, min: 0, max: 100 },
    pluieMmMax: { type: Number, required: true, min: 0, max: 200 },
    ventKmhMax: { type: Number, required: true, min: 0, max: 200 },
    temperatureMinC: { type: Number, required: true, min: -30, max: 60 },
    temperatureMaxC: { type: Number, required: true, min: -30, max: 60 },
    horizonJours: { type: Number, required: true, min: 1, max: 14 },
    derniereVerification: {
      type: new Schema(
        {
          le: { type: Date, required: true },
          seancesVerifiees: { type: Number, default: 0 },
          alertesCreees: { type: Number, default: 0 },
          alertesMisesAJour: { type: Number, default: 0 },
          alertesObsoletes: { type: Number, default: 0 },
          sansCoordonnees: { type: Number, default: 0 },
          erreurs: { type: Number, default: 0 },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: "parametres_meteo" },
);

export const MeteoParametres: Model<IMeteoParametres> =
  (models.MeteoParametres as Model<IMeteoParametres> | undefined) ??
  model<IMeteoParametres>("MeteoParametres", meteoParametresSchema);
