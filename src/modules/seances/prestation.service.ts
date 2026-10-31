import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import type { PrestationDTO } from "./catalogue.types";
import type { PrestationInput } from "./catalogue.schemas";
import { Pack } from "./pack.model";
import { Prestation, type IPrestation } from "./prestation.model";

/** Service catalogue — configurable by the admin without touching the code. */

type Lean = IPrestation & { _id: Types.ObjectId };

const NOT_FOUND = "This service no longer exists.";

function toDTO(doc: Lean, usage: Map<string, number>): PrestationDTO {
  const id = doc._id.toString();
  return {
    id,
    nom: doc.nom,
    description: doc.description || undefined,
    unite: doc.unite || undefined,
    actif: doc.actif,
    nombrePacks: usage.get(id) ?? 0,
  };
}

/** prestationId → number of packs that include it. */
async function usageByPrestation(): Promise<Map<string, number>> {
  const rows = await Pack.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $unwind: "$prestations" },
    { $group: { _id: "$prestations.prestation", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.n]));
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export async function listPrestations(): Promise<PrestationDTO[]> {
  await connectDB();
  const [docs, usage] = await Promise.all([
    Prestation.find().sort({ nom: 1 }).lean<Lean[]>(),
    usageByPrestation(),
  ]);
  return docs.map((doc) => toDTO(doc, usage));
}

export async function createPrestation(input: PrestationInput): Promise<PrestationDTO> {
  await connectDB();
  try {
    const doc = await Prestation.create({
      nom: input.nom,
      description: input.description || undefined,
      unite: input.unite || undefined,
      actif: input.actif,
    });
    return toDTO(doc.toObject() as Lean, new Map());
  } catch (error) {
    if (isDuplicateKey(error)) throw new ServiceError("A service with this name exists.", "nom");
    throw error;
  }
}

export async function updatePrestation(id: string, input: PrestationInput): Promise<void> {
  await connectDB();
  try {
    const res = await Prestation.updateOne(
      { _id: id },
      {
        $set: {
          nom: input.nom,
          description: input.description || undefined,
          unite: input.unite || undefined,
          actif: input.actif,
        },
      },
      { runValidators: true },
    );
    if (res.matchedCount === 0) throw new ServiceError(NOT_FOUND);
  } catch (error) {
    if (isDuplicateKey(error)) throw new ServiceError("A service with this name exists.", "nom");
    throw error;
  }
}

export async function setPrestationActif(id: string, actif: boolean): Promise<void> {
  await connectDB();
  const res = await Prestation.updateOne({ _id: id }, { $set: { actif } });
  if (res.matchedCount === 0) throw new ServiceError(NOT_FOUND);
}

/** A service used by a pack cannot be deleted (deactivate it instead). */
export async function deletePrestation(id: string): Promise<void> {
  await connectDB();
  const used = await Pack.countDocuments({ "prestations.prestation": id });
  if (used > 0) {
    throw new ServiceError(`This service is used by ${used} pack(s). Deactivate it instead.`);
  }
  const res = await Prestation.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new ServiceError(NOT_FOUND);
}
