/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Which MetaMask wallet belongs to which StudioFlow account. Kept in its own collection so
 * the Utilisateur model (another module) is not changed. One wallet per user, one user per wallet.
 */
export interface IWalletLink {
  utilisateur: Types.ObjectId;
  adresse: string;
  /** When the ownership signature was checked. */
  verifieLe: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletLinkSchema = new Schema<IWalletLink>(
  {
    utilisateur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true, unique: true },
    adresse: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      match: /^0x[0-9a-f]{40}$/,
    },
    verifieLe: { type: Date, required: true },
  },
  { timestamps: true, collection: "wallets_utilisateurs" },
);

export const WalletLink: Model<IWalletLink> =
  (models.WalletLink as Model<IWalletLink> | undefined) ??
  model<IWalletLink>("WalletLink", walletLinkSchema);
