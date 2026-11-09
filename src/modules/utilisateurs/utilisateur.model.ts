import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";
import {
  ROLES,
  STATUTS_COMPTE,
  TYPES_CLIENT,
  type Role,
  type StatutCompte,
  type TypeClient,
} from "./utilisateur.types";

/** Collection `utilisateurs` (cahier §4.3 — class Utilisateur). */
export interface IUtilisateur {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone?: string;
  adresse?: string;
  photoProfil?: string;
  role: Role;
  typeClient?: TypeClient;
  entreprise?: string;
  specialite?: string;
  statut: StatutCompte;
  derniereConnexion?: Date;
  /** SnapSeal: wallet proven by a signature (never set by profile or admin forms). */
  walletAddress?: string;
  /**
   * Guided tour: shown while true. Missing = never shown yet (first login), so it shows once.
   * Turned off when the tour ends or on sign-out; turned back on from the profile.
   */
  tutorielActif?: boolean;
  createdAt: Date; // = dateCreation
  updatedAt: Date;
}

export type UtilisateurDocument = HydratedDocument<IUtilisateur>;

const utilisateurSchema = new Schema<IUtilisateur>(
  {
    nom: { type: String, required: true, trim: true, maxlength: 60 },
    prenom: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    motDePasse: { type: String, required: true, select: false },
    telephone: { type: String, trim: true, maxlength: 30 },
    adresse: { type: String, trim: true, maxlength: 200 },
    photoProfil: { type: String, trim: true, maxlength: 500 },
    role: { type: String, enum: ROLES, default: "CLIENT", required: true },
    typeClient: { type: String, enum: TYPES_CLIENT },
    entreprise: { type: String, trim: true, maxlength: 120 },
    specialite: { type: String, trim: true, maxlength: 120 },
    statut: { type: String, enum: STATUTS_COMPTE, default: "ACTIF", required: true },
    derniereConnexion: { type: Date },
    walletAddress: { type: String, lowercase: true, trim: true },
    tutorielActif: { type: Boolean },
  },
  { timestamps: true, collection: "utilisateurs" },
);

utilisateurSchema.index({ role: 1, statut: 1 });
// One wallet per account; accounts without a wallet are not indexed.
utilisateurSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });
utilisateurSchema.index({ createdAt: -1 });

export const Utilisateur: Model<IUtilisateur> =
  (models.Utilisateur as Model<IUtilisateur> | undefined) ??
  model<IUtilisateur>("Utilisateur", utilisateurSchema);
