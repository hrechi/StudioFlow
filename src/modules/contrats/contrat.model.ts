/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Modèle Mongoose indépendant — ne dépend d'aucun autre module.
 */
import { Schema, Types, model, models, type HydratedDocument, type Model } from "mongoose";
import { MODES_CREATION, STATUTS_ANCRAGE, STATUTS_CONTRAT } from "./contrat.types";

const blockchainSchema = new Schema(
  {
    fichier: { type: Schema.Types.ObjectId, required: true }, // GridFS bucket contratsFiges
    sha256: { type: String, required: true, match: /^[0-9a-f]{64}$/ },
    statut: { type: String, enum: STATUTS_ANCRAGE, required: true, default: "EN_ATTENTE" },
    txHash: { type: String, trim: true },
    blockNumber: { type: Number },
    contractAddress: { type: String, trim: true },
    chainId: { type: Number },
    ancreLe: { type: Date },
    erreur: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const champsSchema = new Schema(
  {
    nomClient: { type: String, required: true, trim: true, maxlength: 200 },
    emailClient: { type: String, required: true, trim: true, maxlength: 200 },
    dateSeance: { type: String, trim: true },
    lieuSeance: { type: String, trim: true, maxlength: 300 },
    prestations: { type: String, required: true, trim: true, maxlength: 2000 },
    montantTTC: { type: Number, min: 0 }, // TND (pas en millimes ici : valeur libre saisie par l'admin)
    conditionsAnnulation: { type: String, trim: true, maxlength: 1000 },
    delaiLivraison: { type: String, trim: true, maxlength: 500 },
    clausesSupplementaires: { type: String, trim: true, maxlength: 3000 },
  },
  { _id: false },
);

const contenuSchema = new Schema(
  {
    texteLibre: { type: String, trim: true, maxlength: 20000 },
    champs: { type: champsSchema },
  },
  { _id: false },
);

export interface IContratBlockchain {
  fichier: Types.ObjectId;
  sha256: string;
  statut: (typeof STATUTS_ANCRAGE)[number];
  txHash?: string;
  blockNumber?: number;
  contractAddress?: string;
  chainId?: number;
  ancreLe?: Date;
  erreur?: string;
}

export interface IContratChamps {
  nomClient: string;
  emailClient: string;
  dateSeance?: string;
  lieuSeance?: string;
  prestations: string;
  montantTTC?: number;
  conditionsAnnulation?: string;
  delaiLivraison?: string;
  clausesSupplementaires?: string;
}

export interface IContratContenu {
  texteLibre?: string;
  champs?: IContratChamps;
}

export interface IContrat {
  reference: string;
  titre: string;
  statut: (typeof STATUTS_CONTRAT)[number];
  modeCreation: (typeof MODES_CREATION)[number];
  client: Types.ObjectId;
  clientSnapshot: { nom: string; email: string };
  contenu?: IContratContenu;
  /** GridFS id du PDF uploadé (mode UPLOAD). */
  fichierUpload?: Types.ObjectId;
  blockchain?: IContratBlockchain;
  /** Adresse wallet Ethereum du client (co-signature MetaMask, optionnelle). */
  clientWallet?: string;
  /** Timestamp de co-signature on-chain (rempli côté serveur après vérification). */
  clientSignedAt?: Date;
  dateEnvoi?: Date;
  dateReponse?: Date;
  motifRefus?: string;
  historique: {
    action: string;
    statutAvant?: string;
    statutApres: string;
    par: Types.ObjectId;
    date: Date;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contratSchema = new Schema<IContrat>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      match: /^CTR-\d{4}-\d{4}$/,
    },
    titre: { type: String, required: true, trim: true, maxlength: 200 },
    statut: { type: String, enum: STATUTS_CONTRAT, default: "BROUILLON", required: true, index: true },
    modeCreation: { type: String, enum: MODES_CREATION, required: true },
    client: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true, index: true },
    clientSnapshot: {
      nom: { type: String, required: true },
      email: { type: String, required: true },
    },
    contenu: { type: contenuSchema },
    fichierUpload: { type: Schema.Types.ObjectId },
    blockchain: { type: blockchainSchema },
    clientWallet: { type: String, trim: true, match: /^0x[0-9a-fA-F]{40}$/ },
    clientSignedAt: { type: Date },
    dateEnvoi: { type: Date },
    dateReponse: { type: Date },
    motifRefus: { type: String, trim: true, maxlength: 500 },
    historique: {
      type: [
        {
          action: String,
          statutAvant: String,
          statutApres: { type: String, required: true },
          par: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
  },
  { timestamps: true, collection: "contrats" },
);

contratSchema.index({ client: 1, statut: 1 });
contratSchema.index({ "blockchain.sha256": 1 }, { sparse: true });

export type ContratDocument = HydratedDocument<IContrat>;
export const Contrat: Model<IContrat> =
  (models.Contrat as Model<IContrat> | undefined) ?? model<IContrat>("Contrat", contratSchema);
