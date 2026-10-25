/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Materiel as MaterielModel, type IMateriel } from "./materiel.model";
import type { MaterielInput } from "./materiel.schemas";
import type { Materiel, MaterielStats } from "./materiel.types";
import { hasReservationsAVenir } from "./reservation-materiel.service";

type MaterielLean = IMateriel & { _id: Types.ObjectId };

const NOT_FOUND = "This equipment no longer exists.";
const DUPLICATE_SERIAL = "Serial number already exists";

export function toMaterielDTO(doc: MaterielLean): Materiel {
  return {
    id: doc._id.toString(),
    nom: doc.nom,
    categorie: doc.categorie,
    marque: doc.marque,
    modele: doc.modele,
    numeroSerie: doc.numeroSerie,
    etat: doc.etat,
    dateAchat: doc.dateAchat.toISOString(),
    prix: doc.prix,
    disponible: doc.disponible,
    photo: doc.photo || undefined,
    archive: doc.archive,
  };
}

/** Inventory, by name. Archived equipment is left out unless asked for. */
export async function listMateriels({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<Materiel[]> {
  await connectDB();
  const docs = await MaterielModel.find(includeArchived ? {} : { archive: false })
    .sort({ nom: 1 })
    .lean<MaterielLean[]>();
  return docs.map(toMaterielDTO);
}

/** Also returns archived equipment (its page stays readable); null for an unknown or invalid id. */
export async function getMaterielById(id: string): Promise<Materiel | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await MaterielModel.findById(id).lean<MaterielLean>();
  return doc ? toMaterielDTO(doc) : null;
}

export async function getMaterielStats(): Promise<MaterielStats> {
  await connectDB();
  const [total, disponibles, enPanne] = await Promise.all([
    MaterielModel.countDocuments({ archive: false }),
    MaterielModel.countDocuments({ archive: false, disponible: true }),
    MaterielModel.countDocuments({ archive: false, etat: "EN_PANNE" }),
  ]);
  return { total, disponibles, enPanne };
}

function toWrite(input: MaterielInput) {
  return {
    nom: input.nom,
    categorie: input.categorie,
    marque: input.marque,
    modele: input.modele,
    numeroSerie: input.numeroSerie,
    etat: input.etat,
    dateAchat: new Date(input.dateAchat),
    prix: input.prix,
    // Broken equipment can never be reserved.
    disponible: input.etat === "EN_PANNE" ? false : input.disponible,
    photo: input.photo || undefined,
  };
}

async function assertSerialFree(numeroSerie: string, excludeId?: string): Promise<void> {
  const clash = await MaterielModel.exists({
    numeroSerie,
    ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
  });
  if (clash) throw new ServiceError(DUPLICATE_SERIAL, "numeroSerie");
}

const isDuplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

export async function createMateriel(input: MaterielInput): Promise<{ id: string }> {
  await connectDB();
  await assertSerialFree(input.numeroSerie);
  try {
    const doc = await MaterielModel.create({ ...toWrite(input), archive: false });
    return { id: doc._id.toString() };
  } catch (error) {
    // Two simultaneous creations: the unique index has the last word.
    if (isDuplicateKey(error)) throw new ServiceError(DUPLICATE_SERIAL, "numeroSerie");
    throw error;
  }
}

export async function updateMateriel(id: string, input: MaterielInput): Promise<void> {
  await connectDB();
  const current = await MaterielModel.findById(id).select("archive").lean<MaterielLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (current.archive) throw new ServiceError("Archived equipment cannot be edited.");
  await assertSerialFree(input.numeroSerie, id);
  const { photo, ...rest } = toWrite(input);
  try {
    await MaterielModel.updateOne(
      { _id: id },
      { $set: { ...rest, ...(photo ? { photo } : {}) }, $unset: photo ? {} : { photo: "" } },
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw new ServiceError(DUPLICATE_SERIAL, "numeroSerie");
    throw error;
  }
}

/** Soft delete: the equipment and its reservation history are kept. Refused while it is still booked. */
export async function archiveMateriel(id: string): Promise<void> {
  await connectDB();
  const current = await MaterielModel.findById(id).select("archive").lean<MaterielLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (current.archive) throw new ServiceError("This equipment is already archived.");
  if (await hasReservationsAVenir(id)) {
    throw new ServiceError(
      "This equipment still has upcoming reservations: cancel or complete them before archiving it.",
    );
  }
  await MaterielModel.updateOne({ _id: id }, { $set: { archive: true, disponible: false } });
}
