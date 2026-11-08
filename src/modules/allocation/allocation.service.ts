/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 *
 * Flow of a booking:
 *   1. prepareAllocation  — app-side checks, issues the future MongoDB _id (nothing saved);
 *   2. the browser signs requestAllocation(keccak256(_id), …) with MetaMask;
 *   3. recordRequestedAllocation — verifies the tx on the chain, then saves the document.
 * A rejected or failed transaction leaves nothing in MongoDB. Later steps (confirm, checkout,
 * return, cancel) follow the same "sign → verify → save" pattern in recordAllocationStep.
 *
 * Reads the Materiel collection and the Séances (through the materiel module's seance-source)
 * but never writes to another module's data.
 */
import "server-only";
import { Types, isValidObjectId } from "mongoose";
import { verifyMessage } from "ethers";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Materiel, type IMateriel } from "@/modules/materiel/materiel.model";
import { getMaterielById, listMateriels } from "@/modules/materiel/materiel.service";
import type { Materiel as MaterielDTO } from "@/modules/materiel/materiel.types";
import { STATUTS_BLOQUANTS, peutPasser } from "@/modules/materiel/reservation-materiel.rules";
import { getSeanceReservable } from "@/modules/materiel/seance-source";
import {
  findUtilisateurRefs,
  listPhotographeRefs,
} from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurDTO, UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { AllocationBlockchain, type IAllocationBlockchain } from "./allocation.model";
import {
  CONDITION_INDEX,
  EVENT_OF_ACTION,
  fromChainTime,
  hashId,
  isLinkRequestFresh,
  toChainTime,
  walletLinkMessage,
} from "./allocation.rules";
import type {
  AllocationRecordInput,
  AllocationRequestInput,
  AllocationStepInput,
  WalletLinkInput,
} from "./allocation.schemas";
import {
  actionAllocationLabels,
  statutAllocationConfig,
  statutApres,
  type Allocation,
  type AllocationDetail,
  type EquipementChain,
} from "./allocation.types";
import {
  readAllocationEvents,
  readChainAllocation,
  readEquipments,
  readRoles,
  verifyTransaction,
} from "./blockchain.server";
import { WalletLink } from "./wallet-link.model";

type AllocationLean = IAllocationBlockchain & { _id: Types.ObjectId };
type Actor = Pick<UtilisateurDTO, "id" | "role">;

const NOT_FOUND = "This allocation no longer exists.";

// ── Wallets ──────────────────────────────────────────────────────────────────

export async function getLinkedWallet(utilisateurId: string): Promise<string | null> {
  await connectDB();
  const link = await WalletLink.findOne({ utilisateur: utilisateurId }).lean();
  return link?.adresse ?? null;
}

async function requireWallet(utilisateurId: string): Promise<string> {
  const wallet = await getLinkedWallet(utilisateurId);
  if (!wallet) throw new ServiceError("Link your MetaMask wallet to your account first.");
  return wallet;
}

/** Links a wallet after checking the user really signed the link message with it. */
export async function linkWallet(user: Actor, input: WalletLinkInput): Promise<string> {
  if (!isLinkRequestFresh(input.issuedAt)) {
    throw new ServiceError("This signature has expired. Please sign again.");
  }
  let signer: string;
  try {
    signer = verifyMessage(walletLinkMessage(user.id, input.issuedAt), input.signature);
  } catch {
    throw new ServiceError("Invalid signature.");
  }
  if (signer.toLowerCase() !== input.address) {
    throw new ServiceError("The signature does not match this wallet.");
  }
  await connectDB();
  const owner = await WalletLink.findOne({ adresse: input.address }).lean();
  if (owner && owner.utilisateur.toString() !== user.id) {
    throw new ServiceError("This wallet is already linked to another StudioFlow account.");
  }
  await WalletLink.updateOne(
    { utilisateur: new Types.ObjectId(user.id) },
    { $set: { adresse: input.address, verifieLe: new Date() } },
    { upsert: true },
  );
  return input.address;
}

/** The user's linked wallet and what the contract allows it to do. */
export async function getWalletStatus(utilisateurId: string): Promise<{
  address: string | null;
  owner: boolean;
  staff: boolean;
  chainReachable: boolean;
}> {
  const address = await getLinkedWallet(utilisateurId);
  if (!address) return { address, owner: false, staff: false, chainReachable: true };
  try {
    return { address, ...(await readRoles(address)), chainReachable: true };
  } catch {
    return { address, owner: false, staff: false, chainReachable: false };
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────

async function toDTOs(docs: AllocationLean[]): Promise<Allocation[]> {
  const materielIds = [...new Set(docs.map((d) => d.materiel.toString()))];
  const [materiels, refs] = await Promise.all([
    Materiel.find({ _id: { $in: materielIds } })
      .select("nom categorie numeroSerie")
      .lean<(Pick<IMateriel, "nom" | "categorie" | "numeroSerie"> & { _id: Types.ObjectId })[]>(),
    findUtilisateurRefs(docs.map((d) => d.utilisateur.toString())),
  ]);
  const byId = new Map(materiels.map((m) => [m._id.toString(), m]));
  return docs.map((d) => {
    const m = byId.get(d.materiel.toString());
    return {
      id: d._id.toString(),
      chainAllocationId: d.chainAllocationId,
      materiel: {
        id: d.materiel.toString(),
        nom: m?.nom ?? "Deleted equipment",
        categorie: m?.categorie ?? "ACCESSOIRE",
        numeroSerie: m?.numeroSerie ?? "—",
      },
      seance: { id: d.seance.toString(), titre: d.seanceTitre },
      utilisateur: refs.get(d.utilisateur.toString()) ?? null,
      walletAddress: d.walletAddress,
      dateDebut: d.dateDebut.toISOString(),
      dateFin: d.dateFin.toISOString(),
      statut: d.statut,
      etatRetour: d.etatRetour,
      txHashes: d.txHashes.map((t) => ({ ...t, at: t.at.toISOString() })),
      createdAt: d.createdAt.toISOString(),
    };
  });
}

/** A photographer's own allocations, or every allocation (admin), latest first. */
export async function listAllocations(utilisateurId?: string): Promise<Allocation[]> {
  await connectDB();
  const docs = await AllocationBlockchain.find(
    utilisateurId ? { utilisateur: new Types.ObjectId(utilisateurId) } : {},
  )
    .sort({ dateDebut: -1 })
    .limit(200)
    .lean<AllocationLean[]>();
  return toDTOs(docs);
}

/** An allocation with its blockchain history, and every difference between Mongo and the chain. */
export async function getAllocationDetail(
  id: string,
  user: Actor,
): Promise<AllocationDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await AllocationBlockchain.findById(id).lean<AllocationLean>();
  if (!doc) return null;
  if (user.role !== "ADMIN" && doc.utilisateur.toString() !== user.id) return null;
  const [allocation] = await toDTOs([doc]);

  try {
    const [onChain, events] = await Promise.all([
      readChainAllocation(doc.chainAllocationId),
      readAllocationEvents(doc.chainAllocationId),
    ]);
    const differences: string[] = [];
    if (!onChain) {
      differences.push(
        "This allocation is not on the blockchain (was Ganache reset or the contract redeployed?).",
      );
    } else {
      if (onChain.statut !== doc.statut) {
        differences.push(
          `Status: "${statutAllocationConfig[doc.statut].label}" in StudioFlow, "${statutAllocationConfig[onChain.statut].label}" on the blockchain.`,
        );
      }
      if (onChain.bookedBy !== doc.walletAddress) differences.push("The booking wallet differs.");
      if (
        onChain.dateDebut !== doc.dateDebut.toISOString() ||
        onChain.dateFin !== doc.dateFin.toISOString()
      ) {
        differences.push("The period differs.");
      }
      if (doc.statut === "RETOURNEE" && onChain.etatRetour !== doc.etatRetour) {
        differences.push("The return condition differs.");
      }
    }
    const chainTx = new Set(events.map((e) => e.txHash));
    const mongoTx = new Set(doc.txHashes.map((t) => t.txHash));
    for (const t of doc.txHashes) {
      if (!chainTx.has(t.txHash)) {
        differences.push(
          `"${actionAllocationLabels[t.action]}" (${t.txHash.slice(0, 10)}…) is not on the blockchain.`,
        );
      }
    }
    for (const e of events) {
      if (!mongoTx.has(e.txHash)) {
        differences.push(
          `"${actionAllocationLabels[e.action]}" happened on the blockchain but is not recorded in StudioFlow.`,
        );
      }
    }
    return { allocation, chain: { reachable: true, onChain, events }, differences };
  } catch (error) {
    if (!(error instanceof ServiceError)) throw error;
    return { allocation, chain: { reachable: false, onChain: null, events: [] }, differences: [] };
  }
}

// ── Booking ──────────────────────────────────────────────────────────────────

async function checkMateriel(materielId: string): Promise<MaterielDTO> {
  const materiel = await getMaterielById(materielId);
  if (!materiel || materiel.archive)
    throw new ServiceError("This equipment no longer exists.", "materielId");
  if (materiel.etat === "EN_PANNE")
    throw new ServiceError("This equipment is out of order.", "materielId");
  if (!materiel.disponible) {
    throw new ServiceError("This equipment is currently kept out of reservations.", "materielId");
  }
  return materiel;
}

async function checkSeance(seanceId: string) {
  const seance = await getSeanceReservable(seanceId);
  if (!seance)
    throw new ServiceError("Equipment can no longer be allocated to this session.", "seanceId");
  return seance;
}

/** Same overlap rule as seChevauchent, against this module's own allocations. */
async function assertNoOverlap(materielId: string, dateDebut: Date, dateFin: Date) {
  const conflict = await AllocationBlockchain.exists({
    materiel: new Types.ObjectId(materielId),
    statut: { $in: STATUTS_BLOQUANTS },
    dateDebut: { $lt: dateFin },
    dateFin: { $gt: dateDebut },
  });
  if (conflict) {
    throw new ServiceError("This equipment is already allocated during this period.", "dateDebut");
  }
}

/** Seconds precision, like the contract (uint64 seconds). */
const chainDate = (iso: string) => new Date(fromChainTime(toChainTime(iso)));

/**
 * Step 1: checks everything the app knows and returns the id the allocation will have.
 * Nothing is saved: the document is only created once the transaction is verified.
 */
export async function prepareAllocation(
  user: Actor,
  input: AllocationRequestInput,
): Promise<{ allocationId: string; walletAddress: string }> {
  await connectDB();
  const walletAddress = await requireWallet(user.id);
  await Promise.all([checkMateriel(input.materielId), checkSeance(input.seanceId)]);
  await assertNoOverlap(input.materielId, chainDate(input.dateDebut), chainDate(input.dateFin));
  return { allocationId: new Types.ObjectId().toString(), walletAddress };
}

/** Step 3: the tx is verified on the chain, then the allocation is saved with that same id. */
export async function recordRequestedAllocation(user: Actor, input: AllocationRecordInput) {
  await connectDB();
  const walletAddress = await requireWallet(user.id);
  if (await AllocationBlockchain.exists({ _id: input.allocationId })) {
    throw new ServiceError("This allocation is already recorded.");
  }
  const seance = await checkSeance(input.seanceId);
  const dateDebut = chainDate(input.dateDebut);
  const dateFin = chainDate(input.dateFin);
  const chainAllocationId = hashId(input.allocationId);

  const tx = await verifyTransaction({
    txHash: input.txHash,
    expectedFrom: walletAddress,
    event: EVENT_OF_ACTION.REQUEST,
    expected: {
      allocationId: chainAllocationId,
      equipmentId: hashId(input.materielId),
      seanceId: hashId(input.seanceId),
      bookedBy: walletAddress,
      start: toChainTime(dateDebut),
      end: toChainTime(dateFin),
    },
  });

  try {
    await AllocationBlockchain.create({
      _id: new Types.ObjectId(input.allocationId),
      materiel: new Types.ObjectId(input.materielId),
      seance: new Types.ObjectId(input.seanceId),
      seanceTitre: seance.titre,
      utilisateur: new Types.ObjectId(user.id),
      walletAddress,
      dateDebut,
      dateFin,
      statut: "EN_ATTENTE",
      chainAllocationId,
      txHashes: [
        { action: "REQUEST", txHash: input.txHash, blockNumber: tx.blockNumber, at: tx.at },
      ],
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ServiceError("This allocation is already recorded.");
    }
    throw error;
  }
  return { id: input.allocationId, txHash: input.txHash, blockNumber: tx.blockNumber };
}

/**
 * Confirm / checkout / return / cancel after the user signed it. ADMIN confirms and records
 * returns; the photographer who booked may check out or cancel their own allocation.
 */
export async function recordAllocationStep(user: Actor, input: AllocationStepInput) {
  await connectDB();
  const doc = await AllocationBlockchain.findById(input.id).lean<AllocationLean>();
  if (!doc) throw new ServiceError(NOT_FOUND);

  const isAdmin = user.role === "ADMIN";
  const isBooker = doc.utilisateur.toString() === user.id;
  const adminOnly = input.action === "CONFIRM" || input.action === "RETURN";
  if (adminOnly ? !isAdmin : !isAdmin && !isBooker) {
    throw new ServiceError("You are not allowed to do this on this allocation.");
  }
  const vers = statutApres[input.action];
  if (!peutPasser(doc.statut, vers)) {
    throw new ServiceError(
      `Not allowed: the allocation is "${statutAllocationConfig[doc.statut].label}".`,
    );
  }

  const walletAddress = await requireWallet(user.id);
  const tx = await verifyTransaction({
    txHash: input.txHash,
    expectedFrom: walletAddress,
    event: EVENT_OF_ACTION[input.action],
    expected: {
      allocationId: doc.chainAllocationId,
      by: walletAddress,
      ...(input.action === "RETURN" && input.etatRetour
        ? { condition: BigInt(CONDITION_INDEX[input.etatRetour]) }
        : {}),
    },
  });

  try {
    const updated = await AllocationBlockchain.updateOne(
      { _id: doc._id, statut: doc.statut },
      {
        $set: {
          statut: vers,
          ...(input.action === "RETURN" ? { etatRetour: input.etatRetour } : {}),
        },
        $push: {
          txHashes: {
            action: input.action,
            txHash: input.txHash,
            blockNumber: tx.blockNumber,
            at: tx.at,
          },
        },
      },
    );
    if (!updated.modifiedCount)
      throw new ServiceError("The allocation changed meanwhile; reload the page.");
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ServiceError("This transaction is already recorded.");
    }
    throw error;
  }
}

// ── Form data and admin tools ────────────────────────────────────────────────

/** Equipment that can be allocated: not archived, available, not out of order. */
export async function listAllocatableMateriels(): Promise<MaterielDTO[]> {
  return (await listMateriels()).filter((m) => m.disponible && m.etat !== "EN_PANNE");
}

/** Inventory with its on-chain registration (admin). `chain` is null when Ganache is offline. */
export async function listMaterielsOnChain(): Promise<
  { materiel: MaterielDTO; chain: EquipementChain | null }[]
> {
  const materiels = await listMateriels();
  let chain: EquipementChain[] | null = null;
  try {
    chain = await readEquipments(materiels.map((m) => hashId(m.id)));
  } catch {
    chain = null;
  }
  return materiels.map((materiel, i) => ({ materiel, chain: chain?.[i] ?? null }));
}

/** Admin: checks that the owner wallet registered this equipment on-chain. */
export async function verifyEquipmentRegistered(admin: Actor, materielId: string, txHash: string) {
  const wallet = await requireWallet(admin.id);
  await verifyTransaction({
    txHash,
    expectedFrom: wallet,
    event: "EquipmentRegistered",
    expected: { equipmentId: hashId(materielId) },
  });
}

/** Photographers, their linked wallet and whether the contract knows them as staff. */
export async function listPhotographersWithWallets(): Promise<
  { photographe: UtilisateurRef; wallet: string | null; staff: boolean | null }[]
> {
  await connectDB();
  const photographes = await listPhotographeRefs();
  const links = await WalletLink.find({
    utilisateur: { $in: photographes.map((p) => new Types.ObjectId(p.id)) },
  }).lean();
  const walletOf = new Map(links.map((l) => [l.utilisateur.toString(), l.adresse]));
  return Promise.all(
    photographes.map(async (photographe) => {
      const wallet = walletOf.get(photographe.id) ?? null;
      let staff: boolean | null = null;
      if (wallet) {
        try {
          staff = (await readRoles(wallet)).staff;
        } catch {
          staff = null;
        }
      }
      return { photographe, wallet, staff };
    }),
  );
}

/** Admin: checks that the owner wallet added this photographer's wallet as staff. */
export async function verifyStaffAdded(admin: Actor, utilisateurId: string, txHash: string) {
  const [adminWallet, staffWallet] = await Promise.all([
    requireWallet(admin.id),
    getLinkedWallet(utilisateurId),
  ]);
  if (!staffWallet) throw new ServiceError("This photographer has not linked a wallet yet.");
  await verifyTransaction({
    txHash,
    expectedFrom: adminWallet,
    event: "StaffAdded",
    expected: { account: staffWallet },
  });
}
