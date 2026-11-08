import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  CATEGORIES_GALERIE,
  STATUTS_GALERIE,
  type CategorieGalerie,
  type StatutGalerie,
} from "./galerie.types";

/** Collection `galeries` (cahier §4.3 — class Galerie). */
export interface IGalerie {
  titre: string;
  categorie: CategorieGalerie;
  photoCouverture?: Types.ObjectId; // Photo used as cover (its thumbnail is shown)
  lienAcces: string; // unguessable token of the client link
  motDePasse?: string; // bcrypt hash
  dateExpiration: Date;
  telechargementAutorise: boolean;
  statut: StatutGalerie;
  client: Types.ObjectId;
  seance?: Types.ObjectId; // optional until the Séances module has its model
  /** SnapSeal: sharing and protected files wait for the blockchain steps. Set at creation only. */
  preuveBlockchainRequise?: boolean;
  createdAt: Date; // = dateCreation
  updatedAt: Date;
}

export type GalerieDocument = HydratedDocument<IGalerie>;

const galerieSchema = new Schema<IGalerie>(
  {
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    categorie: { type: String, enum: CATEGORIES_GALERIE, required: true },
    photoCouverture: { type: Schema.Types.ObjectId, ref: "Photo" },
    lienAcces: { type: String, required: true, unique: true },
    motDePasse: { type: String, select: false },
    dateExpiration: { type: Date, required: true },
    telechargementAutorise: { type: Boolean, default: false },
    statut: { type: String, enum: STATUTS_GALERIE, default: "EN_TRI", required: true },
    client: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    seance: { type: Schema.Types.ObjectId, ref: "Seance" },
    // Old documents have no field: they behave as false (normal gallery).
    preuveBlockchainRequise: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "galeries" },
);

galerieSchema.index({ client: 1, createdAt: -1 });
galerieSchema.index({ statut: 1, createdAt: -1 });

export const Galerie: Model<IGalerie> =
  (models.Galerie as Model<IGalerie> | undefined) ?? model<IGalerie>("Galerie", galerieSchema);
