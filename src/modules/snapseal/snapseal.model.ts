import { Schema, model, models, type Model, type Types } from "mongoose";

/** The delivery package: a ZIP of photos chosen in the gallery, stored in GridFS (D10). */
export interface ISealLivraison {
  fichier: Types.ObjectId; // GridFS id in the photoFiles bucket
  nomFichier: string;
  taille: number;
  contentType: string;
  hash: string; // 0x + SHA-256 of the stored bytes, computed by the server
  photos: Types.ObjectId[]; // the gallery photos inside, in ZIP order
  creeLe: Date;
}

/**
 * Collection `galerie_seals`: which on-chain gallery belongs to which Reframe gallery.
 * Kept apart from `galeries` and `photos`, so SnapSeal never alters their documents.
 * The dates and hashes below are facts read from the contracts by the server: they are final
 * on-chain, so once saved they are trusted without reading the chain again (D6).
 */
export interface IGalerieSeal {
  galerie: Types.ObjectId;
  registryAddress: string; // a redeployed contract starts over with new seals
  onChainId: number;
  txHash: string;
  photos: { photo: Types.ObjectId; nomFichier: string; hash: string }[];
  photographerWallet?: string; // from the GalleryCreated event
  clientWallet?: string; // from the GalleryCreated event
  selectionAt?: Date;
  selectedHashes?: string[];
  deliveredAt?: Date;
  deliveryHash?: string; // as published on-chain
  confirmedAt?: Date;
  livraison?: ISealLivraison;
  createdAt: Date;
  updatedAt: Date;
}

const livraisonSchema = new Schema<ISealLivraison>(
  {
    fichier: { type: Schema.Types.ObjectId, required: true },
    nomFichier: { type: String, required: true },
    taille: { type: Number, required: true },
    contentType: { type: String, required: true },
    hash: { type: String, required: true, lowercase: true },
    photos: { type: [Schema.Types.ObjectId], default: [] },
    creeLe: { type: Date, required: true },
  },
  { _id: false },
);

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
    photographerWallet: { type: String, lowercase: true },
    clientWallet: { type: String, lowercase: true },
    selectionAt: { type: Date },
    selectedHashes: { type: [String], default: undefined },
    deliveredAt: { type: Date },
    deliveryHash: { type: String, lowercase: true },
    confirmedAt: { type: Date },
    livraison: { type: livraisonSchema },
  },
  { timestamps: true, collection: "galerie_seals" },
);

galerieSealSchema.index({ galerie: 1, registryAddress: 1 }, { unique: true });

export const GalerieSeal: Model<IGalerieSeal> =
  (models.GalerieSeal as Model<IGalerieSeal> | undefined) ??
  model<IGalerieSeal>("GalerieSeal", galerieSealSchema);
