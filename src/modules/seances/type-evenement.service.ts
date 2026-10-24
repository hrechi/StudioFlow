import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { TYPES_EVENEMENT_PAR_DEFAUT, type TypeEvenementDTO } from "./catalogue.types";
import type { TypeEvenementInput } from "./catalogue.schemas";
import { TypeEvenement, type ITypeEvenement } from "./type-evenement.model";

/**
 * Event types — business rules. Pages and actions use this service; the pack
 * service uses reserveSlot/releaseSlot to enforce the per-type pack limit.
 */

type Lean = ITypeEvenement & { _id: Types.ObjectId };

export function toTypeDTO(doc: Lean): TypeEvenementDTO {
  return {
    id: doc._id.toString(),
    nom: doc.nom,
    slug: doc.slug,
    description: doc.description || undefined,
    actif: doc.actif,
    maxPacks: doc.maxPacks,
    nombrePacks: doc.packsCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

const NOT_FOUND = "This event type no longer exists.";

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listTypesEvenement(): Promise<TypeEvenementDTO[]> {
  await connectDB();
  const docs = await TypeEvenement.find().sort({ nom: 1 }).lean<Lean[]>();
  return docs.map(toTypeDTO);
}

export async function findTypeEvenementById(id: string): Promise<TypeEvenementDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await TypeEvenement.findById(id).lean<Lean>();
  return doc ? toTypeDTO(doc) : null;
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function createTypeEvenement(input: TypeEvenementInput): Promise<TypeEvenementDTO> {
  await connectDB();
  const slug = slugify(input.nom);
  if (!slug) throw new ServiceError("The name must contain letters or digits.", "nom");
  try {
    const doc = await TypeEvenement.create({
      nom: input.nom,
      slug,
      description: input.description || undefined,
      maxPacks: input.maxPacks,
      actif: input.actif,
    });
    return toTypeDTO(doc.toObject() as Lean);
  } catch (error) {
    if (isDuplicateKey(error)) throw new ServiceError("An event type with this name exists.", "nom");
    throw error;
  }
}

export async function updateTypeEvenement(
  id: string,
  input: TypeEvenementInput,
): Promise<TypeEvenementDTO> {
  await connectDB();
  const current = await TypeEvenement.findById(id).lean<Lean>();
  if (!current) throw new ServiceError(NOT_FOUND);

  if (input.maxPacks < current.packsCount) {
    throw new ServiceError(
      `This type already has ${current.packsCount} packs: delete some before lowering the limit.`,
      "maxPacks",
    );
  }
  try {
    const doc = await TypeEvenement.findByIdAndUpdate(
      id,
      {
        $set: {
          nom: input.nom,
          description: input.description || undefined,
          maxPacks: input.maxPacks,
          actif: input.actif,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).lean<Lean>();
    if (!doc) throw new ServiceError(NOT_FOUND);
    return toTypeDTO(doc);
  } catch (error) {
    if (isDuplicateKey(error)) throw new ServiceError("An event type with this name exists.", "nom");
    throw error;
  }
}

export async function setTypeEvenementActif(id: string, actif: boolean): Promise<void> {
  await connectDB();
  const res = await TypeEvenement.updateOne({ _id: id }, { $set: { actif } });
  if (res.matchedCount === 0) throw new ServiceError(NOT_FOUND);
}

/** An event type that still holds packs cannot be deleted (disable it instead). */
export async function deleteTypeEvenement(id: string): Promise<void> {
  await connectDB();
  const doc = await TypeEvenement.findById(id).lean<Lean>();
  if (!doc) throw new ServiceError(NOT_FOUND);
  if (doc.packsCount > 0) {
    throw new ServiceError(
      `"${doc.nom}" still has ${doc.packsCount} pack(s). Delete them first, or disable the event type.`,
    );
  }
  const res = await TypeEvenement.deleteOne({ _id: id, packsCount: 0 });
  if (res.deletedCount === 0) throw new ServiceError("A pack was just added to this event type.");
}

/** Creates the default event types that do not exist yet. Returns how many were added. */
export async function seedDefaultTypesEvenement(): Promise<number> {
  await connectDB();
  let added = 0;
  for (const nom of TYPES_EVENEMENT_PAR_DEFAUT) {
    const res = await TypeEvenement.updateOne(
      { slug: slugify(nom) },
      { $setOnInsert: { nom, slug: slugify(nom), actif: true, maxPacks: 5, packsCount: 0 } },
      { upsert: true },
    );
    if (res.upsertedCount) added += 1;
  }
  return added;
}

// ── Pack limit (used by pack.service) ───────────────────────────────────────

export async function reserveSlot(typeId: Types.ObjectId): Promise<Lean> {
  const reserved = await TypeEvenement.findOneAndUpdate(
    { _id: typeId, $expr: { $lt: ["$packsCount", "$maxPacks"] } },
    { $inc: { packsCount: 1 } },
    { returnDocument: "after" },
  ).lean<Lean>();
  if (reserved) return reserved;

  const type = await TypeEvenement.findById(typeId).lean<Lean>();
  if (!type) throw new ServiceError("Event type not found.", "typeEvenementId");
  throw new ServiceError(
    `Limit reached: "${type.nom}" allows ${type.maxPacks} packs at most.`,
    "typeEvenementId",
  );
}

export async function releaseSlot(typeId: Types.ObjectId): Promise<void> {
  await TypeEvenement.updateOne({ _id: typeId, packsCount: { $gt: 0 } }, { $inc: { packsCount: -1 } });
}
