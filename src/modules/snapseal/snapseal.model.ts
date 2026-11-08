import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Collection `galerie_seals`: which on-chain gallery belongs to which Reframe gallery.
 * Kept apart from `galeries` and `photos`, so SnapSeal never alters their documents.
 */
export interface IGalerieSeal {
  galerie: Types.ObjectId;
  registryAddress: string; // a redeployed contract starts over with new seals
  onChainId: number;
  txHash: string;
  photos: { photo: Types.ObjectId; nomFichier: string; hash: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const galerieSealSchema = new Schema<IGalerieSeal>(
  {
    galerie: { type: Schema.Types.ObjectId, ref: "Galerie", required: true },
    registryAddress: { type: String, required: true, lowercase: true },
    onChainId: { type: Number, required: true },
    txHash: { type: String, required: true },
    photos: {
      type: [
        {
          _id: false,
          photo: { type: Schema.Types.ObjectId, ref: "Photo", required: true },
          nomFichier: { type: String, required: true },
          hash: { type: String, required: true },
        },
      ],
      required: true,
    },
  },
  { timestamps: true, collection: "galerie_seals" },
);

galerieSealSchema.index({ galerie: 1, registryAddress: 1 }, { unique: true });

export const GalerieSeal: Model<IGalerieSeal> =
  (models.GalerieSeal as Model<IGalerieSeal> | undefined) ??
  model<IGalerieSeal>("GalerieSeal", galerieSealSchema);
