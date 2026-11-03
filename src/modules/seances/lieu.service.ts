import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import type { LieuInput } from "./lieu.schemas";
import { Lieu, type ILieu } from "./lieu.model";
import { debutJourTunis, joursOccupes, lireCoordonnee, verifierAlternatives } from "./lieu.rules";
import type { LieuDTO, LieuRef } from "./lieu.types";
import { Seance } from "./seance.model";
import { STATUTS_BLOQUANTS } from "./seance.dto";

/**
 * Locations — business rules, all enforced here (never only in the UI):
 *  - unique name (case / accent insensitive, also enforced by the index);
 *  - alternatives exist, are distinct and are never the location itself;
 *  - a location linked to sessions cannot be deleted (disable it instead);
 *  - deleting a location removes it from the alternatives of the others.
 */

type LieuLean = ILieu & { _id: Types.ObjectId };

const NOT_FOUND = "This location no longer exists.";

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

function toRef(doc: LieuLean): LieuRef {
  return { id: doc._id.toString(), nom: doc.nom, exterieur: doc.exterieur, disponible: doc.disponible };
}

async function hydrate(docs: LieuLean[]): Promise<LieuDTO[]> {
  if (docs.length === 0) return [];
  const altIds = [...new Set(docs.flatMap((d) => d.lieuxAlternatifs.map((a) => a.toString())))];
  const [alts, counts] = await Promise.all([
    altIds.length
      ? Lieu.find({ _id: { $in: altIds } }).select("nom exterieur disponible").lean<LieuLean[]>()
      : Promise.resolve([] as LieuLean[]),
    Seance.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { lieuId: { $in: docs.map((d) => d._id) } } },
      { $group: { _id: "$lieuId", n: { $sum: 1 } } },
    ]),
  ]);
  const altById = new Map(alts.map((a) => [a._id.toString(), toRef(a)]));
  const countById = new Map(counts.map((c) => [c._id.toString(), c.n]));

  return docs.map((d) => ({
    ...toRef(d),
    adresse: d.adresse,
    description: d.description || undefined,
    type: d.type,
    capacite: d.capacite ?? 0,
    coordonnees:
      d.latitude != null && d.longitude != null
        ? { latitude: d.latitude, longitude: d.longitude }
        : null,
    coutSupplementaire: d.coutSupplementaire ?? 0,
    lieuxAlternatifs: d.lieuxAlternatifs.flatMap((a) => {
      const ref = altById.get(a.toString());
      return ref ? [ref] : [];
    }),
    nombreSeances: countById.get(d._id.toString()) ?? 0,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function listLieux(): Promise<LieuDTO[]> {
  await connectDB();
  const docs = await Lieu.find()
    .sort({ nom: 1 })
    .collation({ locale: "fr", strength: 1 })
    .lean<LieuLean[]>();
  return hydrate(docs);
}

/** Light list for selects (session form): every location, with its availability flag. */
export async function listLieuxRefs(): Promise<LieuRef[]> {
  await connectDB();
  const docs = await Lieu.find()
    .select("nom exterieur disponible")
    .sort({ nom: 1 })
    .collation({ locale: "fr", strength: 1 })
    .lean<LieuLean[]>();
  return docs.map(toRef);
}

export async function findLieuById(id: string): Promise<LieuDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Lieu.findById(id).lean<LieuLean>();
  return doc ? (await hydrate([doc]))[0] : null;
}

async function assertAlternatives(ids: string[], selfId?: string): Promise<Types.ObjectId[]> {
  const check = verifierAlternatives(ids, selfId);
  if (!check.ok) throw new ServiceError(check.message, "lieuxAlternatifsIds");
  if (ids.length === 0) return [];
  const found = await Lieu.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw new ServiceError("An alternative location no longer exists.", "lieuxAlternatifsIds");
  }
  return ids.map((id) => new Types.ObjectId(id));
}

function toWrite(input: LieuInput, alternatives: Types.ObjectId[]) {
  const latitude = lireCoordonnee(input.latitude, -90, 90);
  const longitude = lireCoordonnee(input.longitude, -180, 180);
  return {
    nom: input.nom,
    adresse: input.adresse,
    description: input.description || undefined,
    type: input.type,
    exterieur: input.exterieur,
    capacite: input.capacite,
    disponible: input.disponible,
    latitude: typeof latitude === "number" ? latitude : undefined,
    longitude: typeof longitude === "number" ? longitude : undefined,
    coutSupplementaire: input.coutSupplementaire,
    lieuxAlternatifs: alternatives,
  };
}

function duplicateName(): ServiceError {
  return new ServiceError("A location with this name already exists.", "nom");
}

export async function createLieu(input: LieuInput): Promise<{ id: string }> {
  await connectDB();
  const alternatives = await assertAlternatives(input.lieuxAlternatifsIds);
  try {
    const doc = await Lieu.create(toWrite(input, alternatives));
    return { id: doc._id.toString() };
  } catch (error) {
    if (isDuplicateKey(error)) throw duplicateName();
    throw error;
  }
}

export async function updateLieu(id: string, input: LieuInput): Promise<void> {
  await connectDB();
  const current = await Lieu.findById(id).select("_id").lean();
  if (!current) throw new ServiceError(NOT_FOUND);
  const alternatives = await assertAlternatives(input.lieuxAlternatifsIds, id);
  const { latitude, longitude, description, ...rest } = toWrite(input, alternatives);
  const $set: Record<string, unknown> = { ...rest };
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries({ latitude, longitude, description })) {
    if (value === undefined) $unset[key] = "";
    else $set[key] = value;
  }
  try {
    await Lieu.updateOne(
      { _id: id },
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { runValidators: true },
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw duplicateName();
    throw error;
  }
  // Sessions keep a copy of the name (Seance.lieu): keep it in sync with a rename.
  await Seance.updateMany({ lieuId: new Types.ObjectId(id) }, { $set: { lieu: input.nom } });
}

export async function setLieuDisponible(id: string, disponible: boolean): Promise<void> {
  await connectDB();
  const result = await Lieu.updateOne({ _id: id }, { $set: { disponible } });
  if (result.matchedCount === 0) throw new ServiceError(NOT_FOUND);
}

export async function deleteLieu(id: string): Promise<void> {
  await connectDB();
  const current = await Lieu.findById(id).select("nom").lean<{ nom: string }>();
  if (!current) throw new ServiceError(NOT_FOUND);
  const used = await Seance.countDocuments({ lieuId: new Types.ObjectId(id) });
  if (used > 0) {
    throw new ServiceError(
      `This location is used by ${used} session${used > 1 ? "s" : ""}. Disable it instead.`,
    );
  }
  await Lieu.deleteOne({ _id: id });
  const oid = new Types.ObjectId(id);
  await Lieu.updateMany({ lieuxAlternatifs: oid }, { $pull: { lieuxAlternatifs: oid } });
}

/**
 * Busy days of each location over the next `jours` days (Africa/Tunis days), from the sessions
 * that really block it (same statuses as the team conflict rule).
 */
export async function disponibiliteSemaine(
  lieuIds: string[],
  jours = 7,
): Promise<{ debut: number; occupes: Map<string, boolean[]> }> {
  await connectDB();
  const debut = debutJourTunis(new Date());
  const occupes = new Map<string, boolean[]>();
  if (lieuIds.length === 0) return { debut, occupes };

  const fin = new Date(debut + jours * 86_400_000);
  const seances = await Seance.find({
    lieuId: { $in: lieuIds.map((id) => new Types.ObjectId(id)) },
    statut: { $in: STATUTS_BLOQUANTS },
    dateDebut: { $lt: fin },
    dateFin: { $gt: new Date(debut) },
  })
    .select("lieuId dateDebut dateFin")
    .lean<{ lieuId: Types.ObjectId; dateDebut: Date; dateFin: Date }[]>();

  for (const id of lieuIds) {
    occupes.set(
      id,
      joursOccupes(
        seances.filter((s) => s.lieuId.toString() === id),
        debut,
        jours,
      ),
    );
  }
  return { debut, occupes };
}

/** True when a blocking session already uses this location over the slot. */
export async function lieuOccupe(
  lieuId: string,
  debut: Date,
  fin: Date,
  excludeSeanceId?: string,
): Promise<boolean> {
  await connectDB();
  const clash = await Seance.exists({
    lieuId: new Types.ObjectId(lieuId),
    statut: { $in: STATUTS_BLOQUANTS },
    dateDebut: { $lt: fin },
    dateFin: { $gt: debut },
    ...(excludeSeanceId ? { _id: { $ne: new Types.ObjectId(excludeSeanceId) } } : {}),
  });
  return clash !== null;
}

/** Used by the session service: validates and returns the location a session may be linked to. */
export async function findLieuForSeance(
  id: string,
  currentLieuId?: string,
): Promise<{ id: string; nom: string }> {
  await connectDB();
  const doc = await Lieu.findById(id).select("nom disponible").lean<LieuLean>();
  if (!doc) throw new ServiceError("Location not found.", "lieuId");
  if (!doc.disponible && id !== currentLieuId) {
    throw new ServiceError("This location is disabled and cannot be selected.", "lieuId");
  }
  return { id: doc._id.toString(), nom: doc.nom };
}
