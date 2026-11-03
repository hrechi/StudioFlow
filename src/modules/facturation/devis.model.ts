import { Schema, Types, model, models, type Model } from "mongoose";
import {
  MODES_PAIEMENT,
  PLANS_PAIEMENT,
  STATUTS_DECLARATION,
  STATUTS_DEVIS,
  STATUTS_FACTURE,
  TYPES_FACTURE,
} from "./facturation.types";

const ligneSchema = new Schema({
  designation: { type: String, required: true, trim: true, maxlength: 200 },
  quantite: { type: Number, required: true, min: 1, validate: Number.isInteger },
  prixUnitaireHT: { type: Number, required: true, min: 0, validate: Number.isInteger },
}, { _id: false });

const paiementSchema = new Schema({
  montant: { type: Number, required: true, min: 0, validate: Number.isInteger },
  date: { type: Date, required: true },
  modePaiement: { type: String, enum: MODES_PAIEMENT, required: true },
  reference: { type: String, trim: true, maxlength: 120 },
  commentaire: { type: String, trim: true, maxlength: 500 },
  enregistrePar: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
  createdAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

/** A payment the client says they made offline, with the proof the studio checks before confirming. */
const declarationSchema = new Schema({
  montant: { type: Number, required: true, min: 1, validate: Number.isInteger },
  date: { type: Date, required: true },
  modePaiement: { type: String, enum: MODES_PAIEMENT, required: true },
  reference: { type: String, trim: true, maxlength: 120 },
  commentaire: { type: String, trim: true, maxlength: 500 },
  preuve: {
    type: new Schema({
      fichier: { type: Schema.Types.ObjectId, required: true }, // GridFS id (bucket preuvesPaiement)
      nom: { type: String, required: true, maxlength: 200 },
      contentType: { type: String, required: true },
      taille: { type: Number, required: true },
      sha256: { type: String, index: true }, // fingerprint: the same file cannot justify two payments
    }, { _id: false }),
  },
  /** AI reading of the proof + code comparison (see preuve.analyse.ts). Mixed: shape evolves with the checks. */
  analyseIA: { type: Schema.Types.Mixed },
  statut: { type: String, enum: STATUTS_DECLARATION, default: "EN_ATTENTE", required: true },
  motifRejet: { type: String, trim: true, maxlength: 500 },
  declarePar: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
  traitePar: { type: Schema.Types.ObjectId, ref: "utilisateurs" },
  traiteLe: Date,
  createdAt: { type: Date, required: true, default: Date.now },
}, { _id: true });

/** One checkout started on the payment gateway; confirmed only after asking the gateway itself. */
const paiementEnLigneSchema = new Schema({
  ref: { type: String, required: true },
  fournisseur: { type: String, enum: ["KONNECT", "STRIPE", "SIMULATION"], required: true },
  montant: { type: Number, required: true, validate: Number.isInteger }, // millimes of TND credited
  /** What the gateway actually charged when it is not TND (Stripe: EUR cents). */
  devise: { type: String, enum: ["TND", "EUR"], default: "TND" },
  montantDevise: { type: Number, validate: Number.isInteger },
  statut: { type: String, enum: ["EN_ATTENTE", "PAYE", "ECHOUE"], default: "EN_ATTENTE", required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  payeLe: Date,
}, { _id: false });

const factureSchema = new Schema({
  numero: { type: String, required: true },
  type: { type: String, enum: TYPES_FACTURE, required: true },
  montantTTC: { type: Number, required: true, validate: Number.isInteger },
  montantPaye: { type: Number, required: true, default: 0, validate: Number.isInteger },
  montantRestant: { type: Number, required: true, validate: Number.isInteger },
  dateEmission: { type: Date, required: true },
  dateEcheance: { type: Date, required: true },
  statut: { type: String, enum: STATUTS_FACTURE, required: true },
  dateCompletePaiement: Date,
  paiements: { type: [paiementSchema], default: [] },
  declarations: { type: [declarationSchema], default: [] },
  paiementsEnLigne: { type: [paiementEnLigneSchema], default: [] },
}, { _id: true });

export interface IPaiement {
  montant: number;
  date: Date;
  modePaiement: (typeof MODES_PAIEMENT)[number];
  reference?: string;
  commentaire?: string;
  enregistrePar: Types.ObjectId;
  createdAt: Date;
}

export interface IDeclaration {
  _id: Types.ObjectId;
  montant: number;
  date: Date;
  modePaiement: (typeof MODES_PAIEMENT)[number];
  reference?: string;
  commentaire?: string;
  preuve?: { fichier: Types.ObjectId; nom: string; contentType: string; taille: number; sha256?: string };
  analyseIA?: Record<string, unknown>;
  statut: (typeof STATUTS_DECLARATION)[number];
  motifRejet?: string;
  declarePar: Types.ObjectId;
  traitePar?: Types.ObjectId;
  traiteLe?: Date;
  createdAt: Date;
}

export interface IPaiementEnLigne {
  ref: string;
  fournisseur: "KONNECT" | "STRIPE" | "SIMULATION";
  montant: number;
  devise?: "TND" | "EUR";
  montantDevise?: number;
  statut: "EN_ATTENTE" | "PAYE" | "ECHOUE";
  createdAt: Date;
  payeLe?: Date;
}

export interface IFacture {
  _id: Types.ObjectId;
  numero: string;
  type: (typeof TYPES_FACTURE)[number];
  montantTTC: number;
  montantPaye: number;
  montantRestant: number;
  dateEmission: Date;
  dateEcheance: Date;
  statut: (typeof STATUTS_FACTURE)[number];
  dateCompletePaiement?: Date;
  paiements: IPaiement[];
  declarations?: IDeclaration[];
  paiementsEnLigne?: IPaiementEnLigne[];
}

export interface IDevis {
  numero: string;
  client: Types.ObjectId;
  seance: Types.ObjectId;
  clientSnapshot: { nom: string; email: string };
  seanceSnapshot: { titre: string; type?: string; date?: Date };
  lignes: Array<{ designation: string; quantite: number; prixUnitaireHT: number }>;
  remise: number;
  tva: number;
  devise: "TND";
  tauxAcompte: number;
  sousTotal: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  statut: (typeof STATUTS_DEVIS)[number];
  dateEmission: Date;
  dateValidite: Date;
  dateEnvoi?: Date;
  dateReponse?: Date;
  commentaire?: string;
  genereParIA: boolean;
  planPaiement?: (typeof PLANS_PAIEMENT)[number];
  modePaiementPrefere?: (typeof MODES_PAIEMENT)[number];
  aiMeta?: Record<string, unknown>;
  historique: Array<{ action: string; statutAvant?: string; statutApres: string; par: Types.ObjectId; date: Date }>;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  factures: IFacture[];
  createdAt: Date;
  updatedAt: Date;
}

const devisSchema = new Schema<IDevis>({
  numero: { type: String, required: true, unique: true, match: /^DEV-\d{4}-\d{4}$/ },
  client: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true, index: true },
  seance: { type: Schema.Types.ObjectId, ref: "seances", required: true },
  clientSnapshot: { nom: { type: String, required: true }, email: { type: String, required: true } },
  // `type` must be wrapped: a bare `type: String` key would make Mongoose treat the whole snapshot as a String.
  seanceSnapshot: { titre: { type: String, required: true }, type: { type: String }, date: Date },
  lignes: { type: [ligneSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
  remise: { type: Number, required: true, min: 0, max: 100 },
  tva: { type: Number, required: true, min: 0, max: 100, default: 19 },
  devise: { type: String, enum: ["TND"], default: "TND", required: true },
  tauxAcompte: { type: Number, min: 0, max: 100, default: 30, required: true },
  sousTotal: { type: Number, required: true, validate: Number.isInteger },
  montantHT: { type: Number, required: true, validate: Number.isInteger },
  montantTVA: { type: Number, required: true, validate: Number.isInteger },
  montantTTC: { type: Number, required: true, validate: Number.isInteger },
  statut: { type: String, enum: STATUTS_DEVIS, default: "BROUILLON", index: true },
  dateEmission: { type: Date, required: true, index: true },
  dateValidite: { type: Date, required: true },
  dateEnvoi: Date,
  dateReponse: Date,
  commentaire: { type: String, maxlength: 2000 },
  genereParIA: { type: Boolean, default: false },
  planPaiement: { type: String, enum: PLANS_PAIEMENT },
  modePaiementPrefere: { type: String, enum: MODES_PAIEMENT },
  aiMeta: Schema.Types.Mixed,
  historique: { type: [{ action: String, statutAvant: String, statutApres: String, par: Schema.Types.ObjectId, date: { type: Date, default: Date.now } }], default: [] },
  archivedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: "utilisateurs", required: true },
  factures: { type: [factureSchema], default: [] },
}, { timestamps: true, collection: "devis" });

devisSchema.index({ client: 1, statut: 1 });
devisSchema.index({ "factures.paiementsEnLigne.ref": 1 });

export const Devis: Model<IDevis> = (models.Devis as Model<IDevis> | undefined) ?? model<IDevis>("Devis", devisSchema);
