import "server-only";
import { Types, type FilterQuery } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { listPhotographeRefs, findUtilisateurRefs } from "@/modules/utilisateurs/utilisateur.service";
import { Pack, type IPack } from "./pack.model";
import type { ReservationInput } from "./reservation.schemas";
import {
  STATUTS_ANNULABLES_CLIENT,
  STATUTS_BLOQUANTS,
  STATUTS_INITIAUX,
  STATUTS_SUPPRIMABLES,
  TRANSITIONS,
  type SeanceClientDTO,
  type SeanceDTO,
  type StatutSeanceReel,
} from "./seance.dto";
import { Seance, type ISeance } from "./seance.model";
import type { SeanceInput } from "./seance.schemas";
import { deleteTachesOfSeance } from "./tache.service";
import { TypeEvenement, type ITypeEvenement } from "./type-evenement.model";

type SeanceLean = ISeance & { _id: Types.ObjectId };
type TypeLean = ITypeEvenement & { _id: Types.ObjectId };
type PackLean = IPack & { _id: Types.ObjectId };

const NOT_FOUND = "This session no longer exists.";
const FINAL: readonly StatutSeanceReel[] = ["TERMINEE", "ANNULEE"];

const fmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Africa/Tunis",
});

function setUnset(write: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(write)) {
    if (value === undefined) $unset[key] = "";
    else $set[key] = value;
  }
  return Object.keys($unset).length ? { $set, $unset } : { $set };
}

async function hydrate(docs: SeanceLean[]): Promise<SeanceDTO[]> {
  if (docs.length === 0) return [];
  const userIds = docs.flatMap((d) => [
    ...(d.client ? [d.client.toString()] : []),
    ...d.equipe.map((m) => m.employe.toString()),
  ]);
  const typeIds = [...new Set(docs.map((d) => d.typeEvenement.toString()))];
  const packIds = [...new Set(docs.flatMap((d) => (d.pack ? [d.pack.toString()] : [])))];
  const [users, types, packs] = await Promise.all([
    findUtilisateurRefs(userIds),
    TypeEvenement.find({ _id: { $in: typeIds } }).select("nom").lean<TypeLean[]>(),
    Pack.find({ _id: { $in: packIds } }).select("nom prix").lean<PackLean[]>(),
  ]);
  const typeName = new Map(types.map((t) => [t._id.toString(), t.nom]));
  const packInfo = new Map(packs.map((p) => [p._id.toString(), { nom: p.nom, prix: p.prix }]));
  const unknown = (id: string) => ({ id, nom: "Deleted account", prenom: "", photoProfil: undefined });

  return docs.map((d) => ({
    id: d._id.toString(),
    titre: d.titre,
    client: d.client ? (users.get(d.client.toString()) ?? unknown(d.client.toString())) : null,
    clientExterne: d.clientExterne
      ? { nom: d.clientExterne.nom, telephone: d.clientExterne.telephone, email: d.clientExterne.email || undefined }
      : undefined,
    typeEvenement: {
      id: d.typeEvenement.toString(),
      nom: typeName.get(d.typeEvenement.toString()) ?? "Deleted type",
    },
    pack: d.pack
      ? { id: d.pack.toString(), nom: packInfo.get(d.pack.toString())?.nom ?? "Deleted pack", prix: packInfo.get(d.pack.toString())?.prix ?? 0 }
      : null,
    prestationPersonnalisee: d.prestationPersonnalisee || undefined,
    dateDebut: d.dateDebut.toISOString(),
    dateFin: d.dateFin.toISOString(),
    lieu: d.lieu,
    statut: d.statut,
    equipe: d.equipe.map((m) => ({
      employe: users.get(m.employe.toString()) ?? unknown(m.employe.toString()),
      role: m.role,
    })),
    notes: d.notes || undefined,
    messageClient: d.messageClient || undefined,
    prixFinal: d.prixFinal ?? undefined,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function listSeances(filter: { employeId?: string; clientId?: string } = {}): Promise<SeanceDTO[]> {
  await connectDB();
  const query: FilterQuery<ISeance> = {};
  if (filter.employeId) query["equipe.employe"] = new Types.ObjectId(filter.employeId);
  if (filter.clientId) query.client = new Types.ObjectId(filter.clientId);
  const docs = await Seance.find(query).sort({ dateDebut: -1 }).lean<SeanceLean[]>();
  return hydrate(docs);
}

export async function findSeanceById(id: string): Promise<SeanceDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Seance.findById(id).lean<SeanceLean>();
  return doc ? (await hydrate([doc]))[0] : null;
}

async function assertNoConflict(
  equipeIds: string[],
  debut: Date,
  fin: Date,
  excludeId?: string,
): Promise<void> {
  if (equipeIds.length === 0) return;
  const ids = equipeIds.map((id) => new Types.ObjectId(id));
  const query: FilterQuery<ISeance> = {
    statut: { $in: STATUTS_BLOQUANTS },
    "equipe.employe": { $in: ids },
    dateDebut: { $lt: fin },
    dateFin: { $gt: debut },
  };
  if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
  const clashes = await Seance.find(query).lean<SeanceLean[]>();
  if (clashes.length === 0) return;

  const wanted = new Set(equipeIds);
  const names = await findUtilisateurRefs(
    clashes.flatMap((c) => c.equipe.map((m) => m.employe.toString())),
  );
  const messages = clashes.flatMap((c) =>
    c.equipe
      .filter((m) => wanted.has(m.employe.toString()))
      .map((m) => {
        const u = names.get(m.employe.toString());
        return `${u ? `${u.prenom} ${u.nom}` : "An employee"} is already on "${c.titre}" (${fmt.format(c.dateDebut)} – ${fmt.format(c.dateFin)})`;
      }),
  );
  throw new ServiceError(`Schedule conflict: ${messages.join("; ")}.`, "equipe");
}

async function normalize(input: SeanceInput, currentPackId?: string) {
  const debut = new Date(input.dateDebut);
  const fin = new Date(input.dateFin);

  const type = await TypeEvenement.findById(input.typeEvenementId).lean<TypeLean>();
  if (!type) throw new ServiceError("Event type not found.", "typeEvenementId");

  if (input.packId) {
    const pack = await Pack.findById(input.packId).lean<PackLean>();
    if (!pack) throw new ServiceError("Pack not found.", "packId");
    if (pack.typeEvenement.toString() !== input.typeEvenementId) {
      throw new ServiceError("This pack does not belong to the chosen event type.", "packId");
    }
    if (pack.statut === "DESACTIVE" && input.packId !== currentPackId) {
      throw new ServiceError("This pack is disabled and cannot be selected.", "packId");
    }
  }

  if (input.clientId) {
    const clients = await findUtilisateurRefs([input.clientId]);
    if (!clients.has(input.clientId)) throw new ServiceError("Client not found.", "clientId");
  }

  const photographes = new Set((await listPhotographeRefs()).map((p) => p.id));
  for (const m of input.equipe) {
    if (!photographes.has(m.employeId)) {
      throw new ServiceError("Only active team members can be assigned.", "equipe");
    }
  }
  return { debut, fin };
}

function toWrite(input: SeanceInput, debut: Date, fin: Date) {
  return {
    titre: input.titre,
    client: input.clientId ? new Types.ObjectId(input.clientId) : undefined,
    clientExterne: input.clientId
      ? undefined
      : { nom: input.clientNom, telephone: input.clientTelephone, email: input.clientEmail || undefined },
    typeEvenement: new Types.ObjectId(input.typeEvenementId),
    pack: input.packId ? new Types.ObjectId(input.packId) : undefined,
    prestationPersonnalisee: input.packId ? undefined : input.prestationPersonnalisee,
    dateDebut: debut,
    dateFin: fin,
    lieu: input.lieu,
    equipe: input.equipe.map((m) => ({ employe: new Types.ObjectId(m.employeId), role: m.role })),
    notes: input.notes || undefined,
    prixFinal: (input as SeanceInput & { prixFinal?: number }).prixFinal ?? undefined,
  };
}

export async function createSeance(input: SeanceInput): Promise<{ id: string }> {
  await connectDB();
  const statut = (input.statut ?? "DEMANDE_RECUE") as StatutSeanceReel;
  if (!STATUTS_INITIAUX.includes(statut)) throw new ServiceError("Invalid initial status.", "statut");
  const { debut, fin } = await normalize(input);
  await assertNoConflict(input.equipe.map((m) => m.employeId), debut, fin);
  const doc = await Seance.create({ ...toWrite(input, debut, fin), statut });
  return { id: doc._id.toString() };
}

export async function updateSeance(id: string, input: SeanceInput): Promise<void> {
  await connectDB();
  const current = await Seance.findById(id).lean<SeanceLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (FINAL.includes(current.statut)) {
    throw new ServiceError("A completed or cancelled session can no longer be edited.");
  }
  const { debut, fin } = await normalize(input, current.pack?.toString());
  if (STATUTS_BLOQUANTS.includes(current.statut)) {
    await assertNoConflict(input.equipe.map((m) => m.employeId), debut, fin, id);
  }
  await Seance.updateOne({ _id: id }, setUnset(toWrite(input, debut, fin)), { runValidators: true });
}

export async function setSeanceStatut(id: string, statut: StatutSeanceReel): Promise<void> {
  await connectDB();
  const current = await Seance.findById(id).lean<SeanceLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (!TRANSITIONS[current.statut].includes(statut)) {
    throw new ServiceError(`A session cannot go from "${current.statut}" to "${statut}".`);
  }
  if (STATUTS_BLOQUANTS.includes(statut) && !STATUTS_BLOQUANTS.includes(current.statut)) {
    await assertNoConflict(
      current.equipe.map((m) => m.employe.toString()),
      current.dateDebut,
      current.dateFin,
      id,
    );
  }
  await Seance.updateOne({ _id: id }, { $set: { statut } });
}

export async function deleteSeance(id: string): Promise<void> {
  await connectDB();
  const current = await Seance.findById(id).lean<SeanceLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (!STATUTS_SUPPRIMABLES.includes(current.statut)) {
    throw new ServiceError("Only a received request or a cancelled session can be deleted. Cancel it instead.");
  }
  await Seance.deleteOne({ _id: id });
  await deleteTachesOfSeance(id);
}

export async function countSeancesForPack(packId: string): Promise<number> {
  await connectDB();
  return Seance.countDocuments({ pack: packId });
}

export async function setPrixFinal(id: string, prixFinal: number | null): Promise<void> {
  await connectDB();
  const current = await Seance.findById(id).lean<SeanceLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  // On autorise le prix final dès la confirmation et sur les séances terminées
  const STATUTS_PRIX: readonly StatutSeanceReel[] = ["CONFIRMEE", "EN_COURS", "TERMINEE", "REPORTEE"];
  if (!STATUTS_PRIX.includes(current.statut)) {
    throw new ServiceError("Le prix final ne peut être défini que sur une séance confirmée, en cours ou terminée.");
  }
  if (prixFinal === null) {
    await Seance.updateOne({ _id: id }, { $unset: { prixFinal: "" } });
  } else {
    await Seance.updateOne({ _id: id }, { $set: { prixFinal } });
  }
}

export async function countSeancesForType(typeId: string): Promise<number> {
  await connectDB();
  return Seance.countDocuments({ typeEvenement: typeId });
}

const MIN_NOTICE_MS = 24 * 3_600_000;
const DEFAULT_DURATION_MIN = 120;
const MAX_OPEN_REQUESTS = 5;
const OPEN: readonly StatutSeanceReel[] = ["DEMANDE_RECUE", "EN_ATTENTE_CONFIRMATION", "CONFIRMEE", "EN_COURS"];

export async function listSeancesForClient(clientId: string): Promise<SeanceClientDTO[]> {
  const all = await listSeances({ clientId });
  return all.map(({ notes: _notes, equipe: _equipe, ...rest }) => rest);
}

export async function createReservationRequest(
  clientId: string,
  input: ReservationInput,
): Promise<{ id: string }> {
  await connectDB();
  const pack = await Pack.findById(input.packId).lean<PackLean>();
  const type = pack ? await TypeEvenement.findById(pack.typeEvenement).lean<TypeLean>() : null;
  if (!pack || !type || pack.statut !== "PUBLIE" || !type.actif) {
    throw new ServiceError("This pack is no longer available.", "packId");
  }

  const debut = new Date(input.dateDebut);
  if (debut.getTime() < Date.now() + MIN_NOTICE_MS) {
    throw new ServiceError("Please choose a date at least 24 hours from now.", "dateDebut");
  }
  const fin = new Date(debut.getTime() + (pack.dureeEstimeeMinutes || DEFAULT_DURATION_MIN) * 60_000);

  const mine = await Seance.find({ client: clientId, statut: { $in: OPEN } }).lean<SeanceLean[]>();
  if (mine.filter((s) => s.statut === "DEMANDE_RECUE" || s.statut === "EN_ATTENTE_CONFIRMATION").length >= MAX_OPEN_REQUESTS) {
    throw new ServiceError(`You already have ${MAX_OPEN_REQUESTS} pending requests. Wait for the studio's answer.`);
  }
  if (mine.some((s) => s.dateDebut < fin && s.dateFin > debut)) {
    throw new ServiceError("You already have a session or a request at this time.", "dateDebut");
  }

  const doc = await Seance.create({
    titre: `${pack.nom} — ${type.nom}`,
    client: new Types.ObjectId(clientId),
    typeEvenement: type._id,
    pack: pack._id,
    dateDebut: debut,
    dateFin: fin,
    lieu: input.lieu,
    statut: "DEMANDE_RECUE",
    equipe: [],
    messageClient: input.message || undefined,
  });
  return { id: doc._id.toString() };
}

export async function cancelOwnRequest(id: string, clientId: string): Promise<void> {
  await connectDB();
  const current = await Seance.findOne({ _id: id, client: clientId }).lean<SeanceLean>();
  if (!current) throw new ServiceError(NOT_FOUND);
  if (!STATUTS_ANNULABLES_CLIENT.includes(current.statut)) {
    throw new ServiceError("This session is already confirmed: please contact the studio to change it.");
  }
  await Seance.updateOne({ _id: id }, { $set: { statut: "ANNULEE" } });
}
