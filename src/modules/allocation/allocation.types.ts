/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 * Types for equipment allocations recorded on the EquipmentAllocation smart contract.
 * Statuses and conditions reuse the materiel module's enums so both stay in line.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import {
  etatMaterielConfig,
  statutReservationConfig,
  type CategorieMateriel,
  type EtatMateriel,
  type StatutReservation,
} from "@/modules/materiel/materiel.types";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

/** EN_ATTENTE → CONFIRMEE → EN_COURS → RETOURNEE, ANNULEE (same as the materiel module). */
export type StatutAllocation = StatutReservation;
export type EtatEquipement = EtatMateriel;

/** Condition at return: only Good or Worn (contract rule). */
export const ETATS_RETOUR = ["BON", "USE"] as const;
export type EtatRetour = (typeof ETATS_RETOUR)[number];

/** One signed step of an allocation; each maps to one contract function and event. */
export const ACTIONS_ALLOCATION = ["REQUEST", "CONFIRM", "CHECKOUT", "RETURN", "CANCEL"] as const;
export type ActionAllocation = (typeof ACTIONS_ALLOCATION)[number];

/** A transaction that changed this allocation, as saved in MongoDB after verification. */
export type TxAllocation = {
  action: ActionAllocation;
  txHash: string;
  blockNumber: number;
  at: string;
};

/** Collection `allocations_blockchain`. */
export type Allocation = {
  id: string;
  /** keccak256(id) — the allocation's id on the blockchain. */
  chainAllocationId: string;
  materiel: { id: string; nom: string; categorie: CategorieMateriel; numeroSerie: string };
  seance: { id: string; titre: string };
  utilisateur: UtilisateurRef | null;
  walletAddress: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutAllocation;
  etatRetour?: EtatRetour;
  txHashes: TxAllocation[];
  createdAt: string;
};

/** One contract event of an allocation, read from the chain for the history timeline. */
export type ChainEvent = {
  action: ActionAllocation;
  wallet: string;
  blockNumber: number;
  txHash: string;
  at: string;
  etatRetour?: EtatRetour;
};

/** What the contract currently stores for an allocation (null if unknown on-chain). */
export type ChainAllocation = {
  statut: StatutAllocation;
  bookedBy: string;
  dateDebut: string;
  dateFin: string;
  etatRetour?: EtatRetour;
} | null;

export type AllocationDetail = {
  allocation: Allocation;
  chain: { reachable: boolean; onChain: ChainAllocation; events: ChainEvent[] };
  /** Human-readable differences between MongoDB and the blockchain (empty = in sync). */
  differences: string[];
};

/** Equipment as the contract sees it, for the admin "register on-chain" list. */
export type EquipementChain = { registered: boolean; etat?: EtatEquipement; active?: boolean };

/** Public contract info handed to the browser (address + ABI are public anyway). */
export type ChainConfig = { address: string; chainId: number; rpcUrl: string };

export const statutAllocationConfig: StatusConfig<StatutAllocation> = statutReservationConfig;
export const etatEquipementConfig: StatusConfig<EtatEquipement> = etatMaterielConfig;

export const actionAllocationLabels: Record<ActionAllocation, string> = {
  REQUEST: "Requested",
  CONFIRM: "Confirmed",
  CHECKOUT: "Taken",
  RETURN: "Returned",
  CANCEL: "Cancelled",
};

/** Status an allocation reaches after each action. */
export const statutApres: Record<ActionAllocation, StatutAllocation> = {
  REQUEST: "EN_ATTENTE",
  CONFIRM: "CONFIRMEE",
  CHECKOUT: "EN_COURS",
  RETURN: "RETOURNEE",
  CANCEL: "ANNULEE",
};
