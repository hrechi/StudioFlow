import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";
import { STATUTS_CULLING, type StatutCulling } from "./galerie.types";

/**
 * Collection `photos` (cahier §4.3 — class Photo). The image bytes live in the
 * GridFS bucket `photoFiles` (see photo.storage.ts); `url` / `urlMiniature`
 * are built by the service from the photo id.
 */
export interface IPhoto {
  galerie: Types.ObjectId;
  nomFichier: string;
  format: string; // mime type
  taille: number; // bytes
  datePrise?: Date; // EXIF DateTimeOriginal when available
  fichier: Types.ObjectId; // GridFS id of the original
  miniature: Types.ObjectId; // GridFS id of the WebP thumbnail
  scoreQualite: number; // 0–100 (AI, later)
  estFloue: boolean; // AI, later
  tagsIA: string[]; // AI, later
  statutCulling: StatutCulling;
  estFavori: boolean;
  commentaireClient?: string;
  ordreHistoire?: number;
  styleApplique?: string;
  urlRetouchee?: string;
  uploadePar: Types.ObjectId;
  createdAt: Date; // = dateUpload
  updatedAt: Date;
}

export type PhotoDocument = HydratedDocument<IPhoto>;

const photoSchema = new Schema<IPhoto>(
  {
    galerie: { type: Schema.Types.ObjectId, ref: "Galerie", required: true },
    nomFichier: { type: String, required: true, trim: true, maxlength: 255 },
    format: { type: String, required: true },
    taille: { type: Number, required: true, min: 0 },
    datePrise: { type: Date },
    fichier: { type: Schema.Types.ObjectId, required: true },
    miniature: { type: Schema.Types.ObjectId, required: true },
    scoreQualite: { type: Number, default: 0, min: 0, max: 100 },
    estFloue: { type: Boolean, default: false },
    tagsIA: { type: [String], default: [] },
    statutCulling: { type: String, enum: STATUTS_CULLING, default: "EN_ATTENTE", required: true },
    estFavori: { type: Boolean, default: false },
    commentaireClient: { type: String, trim: true, maxlength: 1000 },
    ordreHistoire: { type: Number },
    styleApplique: { type: String, trim: true, maxlength: 60 },
    urlRetouchee: { type: String, trim: true, maxlength: 500 },
    uploadePar: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  },
  { timestamps: true, collection: "photos" },
);

photoSchema.index({ galerie: 1, createdAt: -1 });
photoSchema.index({ galerie: 1, statutCulling: 1 });
photoSchema.index({ createdAt: -1 });

export const Photo: Model<IPhoto> =
  (models.Photo as Model<IPhoto> | undefined) ?? model<IPhoto>("Photo", photoSchema);
