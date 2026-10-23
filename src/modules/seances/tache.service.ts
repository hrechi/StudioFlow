import "server-only";
import { Types, type FilterQuery } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { findUtilisateurRefs, listPhotographeRefs } from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurDTO } from "@/modules/utilisateurs/utilisateur.types";
import { Seance, type ISeance } from "./seance.model";
import { MODELE_TACHES, type StatutTache, type TacheDTO } from "./tache.dto";
import { Tache, type ITache } from "./tache.model";
import type { TacheInput } from "./tache.schemas";

type TacheLean = ITache & { _id: Types.ObjectId };
type SeanceLean = ISeance & { _id: Types.ObjectId };

const NOT_FOUND = "This task no longer exists.";
const DAY = 86_400_000;

async function hydrate(docs: TacheLean[]): Promise<TacheDTO[]> {
  if (docs.length === 0) return [];
  const seanceIds = [...new Set(docs.map((d) => d.seance.toString()))];
  const [seances, users] = await Promise.all([
    Seance.find({ _id: { $in: seanceIds } }).select("titre dateDebut").lean<SeanceLean[]>(),
    findUtilisateurRefs(docs.flatMap((d) => (d.employe ? [d.employe.toString()] : []))),
  ]);
  const seanceById = new Map(seances.map((s) => [s._id.toString(), s]));
  const now = Date.now();

  return docs.map((d) => {
    const s = seanceById.get(d.seance.toString());
    return {
      id: d._id.toString(),
      titre: d.titre,
      description: d.description || undefined,
      seance: {
        id: d.seance.toString(),
        titre: s?.titre ?? "Deleted session",
        dateDebut: s?.dateDebut.toISOString() ?? d.createdAt.toISOString(),
      },
      employe: d.employe ? (users.get(d.employe.toString()) ?? null) : null,
      dateLimite: d.dateLimite?.toISOString() ?? null,
      priorite: d.priorite,
      phase: d.phase,
      statut: d.statut,
      enRetard: !!d.dateLimite && d.statut !== "TERMINEE" && d.dateLimite.getTime() < now,
      createdAt: d.createdAt.toISOString(),
    };
  });
}

export async function listTaches(filter: { employeId?: string } = {}): Promise<TacheDTO[]> {
  await connectDB();
  const query: FilterQuery<ITache> = {};
  if (filter.employeId) query.employe = new Types.ObjectId(filter.employeId);
  const docs = await Tache.find(query).sort({ dateLimite: 1, createdAt: -1 }).lean<TacheLean[]>();
  return hydrate(docs);
}

async function assertValid(input: TacheInput): Promise<void> {
  const seance = await Seance.findById(input.seanceId).select("statut").lean<SeanceLean>();
  if (!seance) throw new ServiceError("Session not found.", "seanceId");
  if (seance.statut === "ANNULEE") {
    throw new ServiceError("This session is cancelled: no tasks can be added.", "seanceId");
  }
  if (input.employeId) {
    const team = new Set((await listPhotographeRefs()).map((p) => p.id));
    if (!team.has(input.employeId)) {
      throw new ServiceError("Only active team members can be assigned.", "employeId");
    }
  }
}

function toWrite(input: TacheInput) {
  return {
    seance: new Types.ObjectId(input.seanceId),
    titre: input.titre,
    description: input.description || undefined,
    employe: input.employeId ? new Types.ObjectId(input.employeId) : undefined,
    dateLimite: input.dateLimite ? new Date(input.dateLimite) : undefined,
    priorite: input.priorite,
    phase: input.phase,
    statut: input.statut,
  };
}

export async function createTache(input: TacheInput): Promise<{ id: string }> {
  await connectDB();
  await assertValid(input);
  const doc = await Tache.create(toWrite(input));
  return { id: doc._id.toString() };
}

export async function updateTache(id: string, input: TacheInput): Promise<void> {
  await connectDB();
  await assertValid(input);
  const { employe, dateLimite, ...rest } = toWrite(input);
  const res = await Tache.updateOne(
    { _id: id },
    {
      $set: { ...rest, ...(employe ? { employe } : {}), ...(dateLimite ? { dateLimite } : {}) },
      $unset: { ...(employe ? {} : { employe: "" }), ...(dateLimite ? {} : { dateLimite: "" }) },
    },
  );
  if (res.matchedCount === 0) throw new ServiceError(NOT_FOUND);
}

export async function setTacheStatut(
  id: string,
  statut: StatutTache,
  actor: Pick<UtilisateurDTO, "id" | "role">,
): Promise<void> {
  await connectDB();
  const tache = await Tache.findById(id).lean<TacheLean>();
  if (!tache) throw new ServiceError(NOT_FOUND);
  if (actor.role !== "ADMIN" && tache.employe?.toString() !== actor.id) {
    throw new ServiceError("You can only update the tasks assigned to you.");
  }
  await Tache.updateOne({ _id: id }, { $set: { statut } });
}

export async function deleteTache(id: string): Promise<void> {
  await connectDB();
  const res = await Tache.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new ServiceError(NOT_FOUND);
}

export async function deleteTachesOfSeance(seanceId: string): Promise<void> {
  await connectDB();
  await Tache.deleteMany({ seance: seanceId });
}

export async function generateTachesForSeance(seanceId: string): Promise<number> {
  await connectDB();
  const seance = await Seance.findById(seanceId).lean<SeanceLean>();
  if (!seance) throw new ServiceError("Session not found.");
  if (seance.statut === "ANNULEE") throw new ServiceError("This session is cancelled.");

  const existing = new Set(
    (await Tache.find({ seance: seanceId }).select("titre").lean<TacheLean[]>()).map((t) => t.titre),
  );
  const docs = MODELE_TACHES.filter((m) => !existing.has(m.titre)).map((m) => {
    const base = m.phase === "APRES" ? seance.dateFin : seance.dateDebut;
    return {
      seance: seance._id,
      titre: m.titre,
      phase: m.phase,
      priorite: m.priorite,
      statut: "A_FAIRE" as const,
      dateLimite: new Date(base.getTime() + m.jours * DAY),
    };
  });
  if (docs.length) await Tache.insertMany(docs);
  return docs.length;
}
