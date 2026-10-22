import "server-only";
import { Types, type FilterQuery } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import type {
  CataloguePublicDTO,
  PackDTO,
  StatutPack,
  TypeEvenementRef,
} from "./catalogue.types";
import type { PackInput } from "./catalogue.schemas";
import { Pack, type IPack } from "./pack.model";
import { Prestation, type IPrestation } from "./prestation.model";
import { TypeEvenement, type ITypeEvenement } from "./type-evenement.model";
import { releaseSlot, reserveSlot } from "./type-evenement.service";

/**
 * Packs — business rules, all enforced here (never only in the UI):
 *  - max packs per event type (atomic, see reserveSlot);
 *  - publication rules (active type, description, at least one active service);
 *  - unique pack name per event type.
 */

type PackLean = IPack & { _id: Types.ObjectId };
type TypeLean = ITypeEvenement & { _id: Types.ObjectId };
type PrestationLean = IPrestation & { _id: Types.ObjectId };

const NOT_FOUND = "This pack no longer exists.";

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

function toObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Hydration (embedded refs → names) ───────────────────────────────────────

async function hydrate(docs: PackLean[]): Promise<PackDTO[]> {
  if (docs.length === 0) return [];
  const typeIds = [...new Set(docs.map((d) => d.typeEvenement.toString()))];
  const prestationIds = [...new Set(docs.flatMap((d) => d.prestations.map((l) => l.prestation.toString())))];
  const [types, prestations] = await Promise.all([
    TypeEvenement.find({ _id: { $in: typeIds } }).lean<TypeLean[]>(),
    Prestation.find({ _id: { $in: prestationIds } }).lean<PrestationLean[]>(),
  ]);
  const typeById = new Map(types.map((t) => [t._id.toString(), t]));
  const prestationById = new Map(prestations.map((p) => [p._id.toString(), p]));

  return docs.map((doc) => {
    const type = typeById.get(doc.typeEvenement.toString());
    const typeRef: TypeEvenementRef = type
      ? { id: type._id.toString(), nom: type.nom, slug: type.slug, actif: type.actif }
      : { id: doc.typeEvenement.toString(), nom: "Deleted type", slug: "", actif: false };
    return {
      id: doc._id.toString(),
      nom: doc.nom,
      description: doc.description,
      prix: doc.prix,
      afficherPrix: doc.afficherPrix,
      dureeEstimeeMinutes: doc.dureeEstimeeMinutes,
      statut: doc.statut,
      typeEvenement: typeRef,
      prestations: doc.prestations.map((line) => {
        const p = prestationById.get(line.prestation.toString());
        return {
          prestationId: line.prestation.toString(),
          nom: p?.nom ?? "Deleted service",
          unite: p?.unite || undefined,
          quantite: line.quantite,
          conditions: line.conditions || undefined,
        };
      }),
      options: doc.options.map((o) => ({
        nom: o.nom,
        prix: o.prix,
        description: o.description || undefined,
      })),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  });
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listPacks(
  filter: { typeId?: string; statut?: StatutPack; q?: string } = {},
): Promise<PackDTO[]> {
  await connectDB();
  const query: FilterQuery<IPack> = {};
  if (filter.typeId && toObjectId(filter.typeId)) query.typeEvenement = filter.typeId;
  if (filter.statut) query.statut = filter.statut;
  if (filter.q) query.nom = { $regex: escapeRegex(filter.q), $options: "i" };
  const docs = await Pack.find(query).sort({ typeEvenement: 1, prix: 1 }).lean<PackLean[]>();
  return hydrate(docs);
}

export async function findPackById(id: string): Promise<PackDTO | null> {
  if (!toObjectId(id)) return null;
  await connectDB();
  const doc = await Pack.findById(id).lean<PackLean>();
  return doc ? (await hydrate([doc]))[0] : null;
}

export async function listPublicCatalogue(): Promise<CataloguePublicDTO> {
  await connectDB();
  const types = await TypeEvenement.find({ actif: true }).sort({ nom: 1 }).lean<TypeLean[]>();
  if (types.length === 0) return [];
  const docs = await Pack.find({
    statut: "PUBLIE",
    typeEvenement: { $in: types.map((t) => t._id) },
  })
    .sort({ prix: 1 })
    .lean<PackLean[]>();
  const packs = await hydrate(docs);

  return types
    .map((type) => ({
      type: {
        id: type._id.toString(),
        nom: type.nom,
        slug: type.slug,
        description: type.description || undefined,
      },
      packs: packs
        .filter((p) => p.typeEvenement.id === type._id.toString())
        .map((p) => ({
          id: p.id,
          nom: p.nom,
          description: p.description,
          prix: p.afficherPrix ? p.prix : null,
          dureeEstimeeMinutes: p.dureeEstimeeMinutes,
          prestations: p.prestations.map(({ nom, unite, quantite, conditions }) => ({
            nom,
            unite,
            quantite,
            conditions,
          })),
          options: p.options,
        })),
    }))
    .filter((entry) => entry.packs.length > 0);
}

// ── Validation ──────────────────────────────────────────────────────────────

async function assertPublishable(input: PackInput, type: TypeLean): Promise<void> {
  if (!type.actif) {
    throw new ServiceError(`"${type.nom}" is disabled: enable it before publishing a pack.`, "statut");
  }
  if (input.description.trim().length < 10) {
    throw new ServiceError("Add a description (10 characters minimum) before publishing.", "description");
  }
  if (input.prestations.length === 0) {
    throw new ServiceError("Add at least one service before publishing.", "prestations");
  }
  const active = await Prestation.countDocuments({
    _id: { $in: input.prestations.map((l) => l.prestationId) },
    actif: true,
  });
  if (active !== input.prestations.length) {
    throw new ServiceError("Some selected services are deactivated: remove them first.", "prestations");
  }
}

async function assertServicesExist(input: PackInput): Promise<void> {
  const found = await Prestation.countDocuments({
    _id: { $in: input.prestations.map((l) => l.prestationId) },
  });
  if (found !== input.prestations.length) {
    throw new ServiceError("Some selected services no longer exist.", "prestations");
  }
}

function toWrite(input: PackInput) {
  return {
    nom: input.nom,
    typeEvenement: new Types.ObjectId(input.typeEvenementId),
    description: input.description,
    prix: input.prix,
    afficherPrix: input.afficherPrix,
    dureeEstimeeMinutes: input.dureeEstimeeMinutes,
    statut: input.statut,
    prestations: input.prestations.map((l) => ({
      prestation: new Types.ObjectId(l.prestationId),
      quantite: l.quantite,
      conditions: l.conditions || undefined,
    })),
    options: input.options.map((o) => ({
      nom: o.nom,
      prix: o.prix,
      description: o.description || undefined,
    })),
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function createPack(input: PackInput): Promise<{ id: string }> {
  await connectDB();
  await assertServicesExist(input);
  const typeId = new Types.ObjectId(input.typeEvenementId);

  const type = await reserveSlot(typeId);
  try {
    if (input.statut === "PUBLIE") await assertPublishable(input, type);
    const doc = await Pack.create(toWrite(input));
    return { id: doc._id.toString() };
  } catch (error) {
    await releaseSlot(typeId);
    if (isDuplicateKey(error)) {
      throw new ServiceError("This event type already has a pack with this name.", "nom");
    }
    throw error;
  }
}

export async function updatePack(id: string, input: PackInput): Promise<void> {
  await connectDB();
  const current = await Pack.findById(id).lean<PackLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  await assertServicesExist(input);

  const newTypeId = new Types.ObjectId(input.typeEvenementId);
  const moved = !current.typeEvenement.equals(newTypeId);

  let type: TypeLean | null;
  if (moved) {
    type = await reserveSlot(newTypeId);
  } else {
    type = await TypeEvenement.findById(newTypeId).lean<TypeLean>();
    if (!type) throw new ServiceError("Event type not found.", "typeEvenementId");
  }

  try {
    if (input.statut === "PUBLIE") await assertPublishable(input, type);
    await Pack.updateOne({ _id: id }, { $set: toWrite(input) }, { runValidators: true });
  } catch (error) {
    if (moved) await releaseSlot(newTypeId);
    if (isDuplicateKey(error)) {
      throw new ServiceError("This event type already has a pack with this name.", "nom");
    }
    throw error;
  }
  if (moved) await releaseSlot(current.typeEvenement);
}

export async function setPackStatut(id: string, statut: StatutPack): Promise<void> {
  await connectDB();
  const pack = await findPackById(id);
  if (!pack) throw new ServiceError(NOT_FOUND);
  if (statut === "PUBLIE") {
    const type = await TypeEvenement.findById(pack.typeEvenement.id).lean<TypeLean>();
    if (!type) throw new ServiceError("Event type not found.");
    await assertPublishable(
      {
        nom: pack.nom,
        typeEvenementId: pack.typeEvenement.id,
        description: pack.description,
        prix: pack.prix,
        afficherPrix: pack.afficherPrix,
        dureeEstimeeMinutes: pack.dureeEstimeeMinutes,
        statut,
        prestations: pack.prestations.map((l) => ({
          prestationId: l.prestationId,
          quantite: l.quantite,
          conditions: l.conditions ?? "",
        })),
        options: [],
      },
      type,
    );
  }
  await Pack.updateOne({ _id: id }, { $set: { statut } });
}

export async function deletePack(id: string): Promise<void> {
  await connectDB();
  const doc = await Pack.findByIdAndDelete(id).lean<PackLean>();
  if (!doc) throw new ServiceError(NOT_FOUND);
  await releaseSlot(doc.typeEvenement);
}
