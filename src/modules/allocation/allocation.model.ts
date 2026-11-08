/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Schema, model, models, type Model, type Types } from "mongoose";
import { STATUTS_RESERVATION } from "@/modules/materiel/materiel.types";
import {
  ACTIONS_ALLOCATION,
  ETATS_RETOUR,
  type ActionAllocation,
  type EtatRetour,
  type StatutAllocation,
} from "./allocation.types";

export interface ITxAllocation {
  action: ActionAllocation;
  txHash: string;
  blockNumber: number;
  at: Date;
}

/**
 * MongoDB mirror of an on-chain allocation. Written only after the server has verified the
 * matching transaction on the blockchain — the chain stays the source of truth.
 */
export interface IAllocationBlockchain {
  materiel: Types.ObjectId;
  /** Séance id (Séances module) + title copied at booking time, like reservations_materiel. */
  seance: Types.ObjectId;
  seanceTitre: string;
  utilisateur: Types.ObjectId;
  walletAddress: string;
  dateDebut: Date;
  dateFin: Date;
  statut: StatutAllocation;
  etatRetour?: EtatRetour;
  /** keccak256 of this document's _id (bytes32 hex). */
  chainAllocationId: string;
  txHashes: ITxAllocation[];
  createdAt: Date;
  updatedAt: Date;
}

const txSchema = new Schema<ITxAllocation>(
  {
    action: { type: String, enum: ACTIONS_ALLOCATION, required: true },
    txHash: { type: String, required: true, match: /^0x[0-9a-f]{64}$/ },
    blockNumber: { type: Number, required: true, min: 0 },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const allocationSchema = new Schema<IAllocationBlockchain>(
  {
    materiel: { type: Schema.Types.ObjectId, ref: "Materiel", required: true },
    seance: { type: Schema.Types.ObjectId, required: true },
    seanceTitre: { type: String, required: true, trim: true, maxlength: 120 },
    utilisateur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    walletAddress: { type: String, required: true, lowercase: true, match: /^0x[0-9a-f]{40}$/ },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    statut: { type: String, enum: STATUTS_RESERVATION, default: "EN_ATTENTE", required: true },
    etatRetour: { type: String, enum: ETATS_RETOUR },
    chainAllocationId: { type: String, required: true, unique: true, match: /^0x[0-9a-f]{64}$/ },
    txHashes: { type: [txSchema], default: [] },
  },
  { timestamps: true, collection: "allocations_blockchain" },
);

allocationSchema.index({ utilisateur: 1, dateDebut: -1 });
allocationSchema.index({ materiel: 1, dateDebut: 1, dateFin: 1 });
// A transaction is recorded once, whatever the allocation.
allocationSchema.index({ "txHashes.txHash": 1 }, { unique: true, sparse: true });

export const AllocationBlockchain: Model<IAllocationBlockchain> =
  (models.AllocationBlockchain as Model<IAllocationBlockchain> | undefined) ??
  model<IAllocationBlockchain>("AllocationBlockchain", allocationSchema);
