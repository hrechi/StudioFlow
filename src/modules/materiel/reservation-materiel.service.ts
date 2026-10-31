/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurRefs } from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurDTO } from "@/modules/utilisateurs/utilisateur.types";
import { Materiel as MaterielModel, type IMateriel } from "./materiel.model";
import {
  statutReservationConfig,
  type Reservation,
  type ResultatReservation,
  type StatutReservation,
} from "./materiel.types";
import { ReservationMateriel, type IReservationMateriel } from "./reservation-materiel.model";
import { STATUTS_BLOQUANTS, peutPasser } from "./reservation-materiel.rules";
import type { PanneInput, ReservationsInput, RetourInput } from "./reservation-materiel.schemas";
import { getSeanceReservable, type SeanceReservableDTO } from "./seance-source";

type ReservationLean = IReservationMateriel & { _id: Types.ObjectId };
type MaterielLean = IMateriel & { _id: Types.ObjectId };
type Actor = Pick<UtilisateurDTO, "id" | "role">;

const NOT_FOUND = "This reservation no longer exists.";

export type ReservationFilter = {
  materielId?: string;
  statut?: StatutReservation;
  utilisateurId?: string;
  /** Period: keeps the reservations that cross [du, au]. */
  du?: Date | string;
  au?: Date | string;
};

async function hydrate(docs: ReservationLean[]): Promise<Reservation[]> {
  if (docs.length === 0) return [];
  const materielIds = [...new Set(docs.map((d) => d.materiel.toString()))];
  const [materiels, users] = await Promise.all([
    MaterielModel.find({ _id: { $in: materielIds } })
      .select("nom categorie")
      .lean<MaterielLean[]>(),
    findUtilisateurRefs([...new Set(docs.map((d) => d.utilisateur.toString()))]),
  ]);
  const materielById = new Map(materiels.map((m) => [m._id.toString(), m]));

  return docs.map((d) => {
    const m = materielById.get(d.materiel.toString());
    return {
      id: d._id.toString(),
      dateDebut: d.dateDebut.toISOString(),
      dateFin: d.dateFin.toISOString(),
      statut: d.statut,
      remarqueRetour: d.remarqueRetour || undefined,
      materiel: {
        id: d.materiel.toString(),
        nom: m?.nom ?? "Deleted equipment",
        categorie: m?.categorie ?? "ACCESSOIRE",
      },
      seance: { id: d.seance.toString(), titre: d.seanceTitre, typeEvenement: d.typeEvenement },
      utilisateur: users.get(d.utilisateur.toString()) ?? null,
    };
  });
}

/** Most recent first. */
export async function listReservations(filter: ReservationFilter = {}): Promise<Reservation[]> {
  await connectDB();
  const query: QueryFilter<IReservationMateriel> = {};
  if (filter.materielId) query.materiel = new Types.ObjectId(filter.materielId);
  if (filter.utilisateurId) query.utilisateur = new Types.ObjectId(filter.utilisateurId);
  if (filter.statut) query.statut = filter.statut;
  if (filter.au) query.dateDebut = { $lt: new Date(filter.au) };
  if (filter.du) query.dateFin = { $gt: new Date(filter.du) };
  const docs = await ReservationMateriel.find(query)
    .sort({ dateDebut: -1 })
    .lean<ReservationLean[]>();
  return hydrate(docs);
}

/** Equipment currently booked (confirmed or in use) — dashboard counter. */
export async function countReservationsActives(): Promise<number> {
  await connectDB();
  return ReservationMateriel.countDocuments({ statut: { $in: ["CONFIRMEE", "EN_COURS"] } });
}

/** Reservations that still hold the item (blocking status, not over yet). */
export async function hasReservationsAVenir(materielId: string): Promise<boolean> {
  await connectDB();
  return !!(await ReservationMateriel.exists(aVenirQuery(materielId)));
}

function aVenirQuery(materielId: string | Types.ObjectId): QueryFilter<IReservationMateriel> {
  return {
    materiel: new Types.ObjectId(materielId),
    statut: { $in: STATUTS_BLOQUANTS },
    dateFin: { $gt: new Date() },
  };
}

function assertUtilisable(materiel: MaterielLean | null): asserts materiel is MaterielLean {
  if (!materiel) throw new ServiceError("Equipment not found.", "materiel");
  if (materiel.archive) throw new ServiceError("This equipment is archived.", "materiel");
  if (materiel.etat === "EN_PANNE") {
    throw new ServiceError("This equipment is out of order.", "materiel");
  }
  if (!materiel.disponible) {
    throw new ServiceError("This equipment is not available for reservations.", "materiel");
  }
}

/** Same approach as the Séances module: any blocking reservation crossing [debut, fin[. */
async function assertNoConflict(
  materielId: Types.ObjectId,
  debut: Date,
  fin: Date,
  excludeId?: Types.ObjectId,
): Promise<void> {
  const query: QueryFilter<IReservationMateriel> = {
    materiel: materielId,
    statut: { $in: STATUTS_BLOQUANTS },
    dateDebut: { $lt: fin },
    dateFin: { $gt: debut },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const clash = await ReservationMateriel.findOne(query)
    .sort({ dateDebut: 1 })
    .lean<ReservationLean>();
  if (!clash) return;
  throw new ServiceError(
    `Already reserved for “${clash.seanceTitre}” (${formatDateTime(clash.dateDebut)} → ${formatDateTime(clash.dateFin)}).`,
    "materiel",
  );
}

async function reserveOne(
  actor: Actor,
  seance: SeanceReservableDTO,
  materiel: MaterielLean | null,
  debut: Date,
  fin: Date,
): Promise<string> {
  assertUtilisable(materiel);
  await assertNoConflict(materiel._id, debut, fin);
  const doc = await ReservationMateriel.create({
    materiel: materiel._id,
    seance: new Types.ObjectId(seance.id),
    seanceTitre: seance.titre,
    typeEvenement: seance.typeEvenement,
    utilisateur: new Types.ObjectId(actor.id),
    dateDebut: debut,
    dateFin: fin,
    statut: "EN_ATTENTE",
  });
  return doc._id.toString();
}

/**
 * Reserves several items for one séance over the same period. Each item is checked on its
 * own and gets its own result, so one unavailable item does not block the rest of the kit.
 */
export async function createReservations(
  actor: Actor,
  input: ReservationsInput,
): Promise<ResultatReservation[]> {
  await connectDB();
  const debut = new Date(input.dateDebut);
  const fin = new Date(input.dateFin);
  if (fin <= debut) throw new ServiceError("The end must be after the start", "dateFin");
  if (fin <= new Date()) throw new ServiceError("This period is already over.", "dateFin");

  const seance = await getSeanceReservable(input.seanceId);
  if (!seance) {
    throw new ServiceError("This session is finished, cancelled or no longer exists.", "seanceId");
  }

  const ids = [...new Set(input.materielIds)];
  const materiels = await MaterielModel.find({ _id: { $in: ids } }).lean<MaterielLean[]>();
  const byId = new Map(materiels.map((m) => [m._id.toString(), m]));

  const results: ResultatReservation[] = [];
  // One after the other: each item's conflict check sees the reservations created before it.
  for (const materielId of ids) {
    const materiel = byId.get(materielId) ?? null;
    const materielNom = materiel?.nom ?? "Unknown equipment";
    try {
      const reservationId = await reserveOne(actor, seance, materiel, debut, fin);
      results.push({ materielId, materielNom, ok: true, reservationId });
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
      results.push({ materielId, materielNom, ok: false, error: error.message });
    }
  }
  return results;
}

/** Single item: same checks, but a refusal is thrown on the `materiel` field. */
export async function createReservation(
  actor: Actor,
  input: Omit<ReservationsInput, "materielIds"> & { materielId: string },
): Promise<{ id: string }> {
  const [result] = await createReservations(actor, { ...input, materielIds: [input.materielId] });
  if (!result.ok) throw new ServiceError(result.error, "materiel");
  return { id: result.reservationId };
}

async function findOwned(id: string, actor: Actor): Promise<ReservationLean> {
  const reservation = await ReservationMateriel.findById(id).lean<ReservationLean>();
  if (!reservation) throw new ServiceError(NOT_FOUND);
  if (actor.role !== "ADMIN" && reservation.utilisateur.toString() !== actor.id) {
    throw new ServiceError("You can only manage your own reservations.");
  }
  return reservation;
}

async function transition(
  reservation: ReservationLean,
  vers: StatutReservation,
  extra: { $set?: Record<string, unknown>; $unset?: Record<string, ""> } = {},
): Promise<void> {
  if (!peutPasser(reservation.statut, vers)) {
    const de = statutReservationConfig[reservation.statut].label.toLowerCase();
    const a = statutReservationConfig[vers].label.toLowerCase();
    throw new ServiceError(`This reservation is ${de}: it cannot become ${a}.`);
  }
  // The current status is part of the filter, so two concurrent changes cannot both apply.
  const res = await ReservationMateriel.updateOne(
    { _id: reservation._id, statut: reservation.statut },
    { $set: { statut: vers, ...extra.$set }, ...(extra.$unset ? { $unset: extra.$unset } : {}) },
  );
  if (res.matchedCount === 0) {
    throw new ServiceError("This reservation was just changed by someone else. Reload the page.");
  }
}

async function assertMaterielUtilisable(reservation: ReservationLean): Promise<void> {
  assertUtilisable(await MaterielModel.findById(reservation.materiel).lean<MaterielLean>());
}

export async function confirmerReservation(id: string, actor: Actor): Promise<void> {
  await connectDB();
  const reservation = await findOwned(id, actor);
  await assertMaterielUtilisable(reservation);
  await transition(reservation, "CONFIRMEE");
}

/** Equipment handed over: the reservation is in use. */
export async function demarrerReservation(id: string, actor: Actor): Promise<void> {
  await connectDB();
  const reservation = await findOwned(id, actor);
  await assertMaterielUtilisable(reservation);
  await transition(reservation, "EN_COURS");
}

export async function annulerReservation(id: string, actor: Actor): Promise<void> {
  await connectDB();
  await transition(await findOwned(id, actor), "ANNULEE");
}

/** Return after use (cahier: Reservation.enregistrerRetour(remarque)) + condition on return. */
export async function enregistrerRetour(
  id: string,
  input: RetourInput,
  actor: Actor,
): Promise<void> {
  await connectDB();
  const reservation = await findOwned(id, actor);
  await transition(
    reservation,
    "RETOURNEE",
    input.remarque
      ? { $set: { remarqueRetour: input.remarque } }
      : { $unset: { remarqueRetour: "" } },
  );
  // A breakdown reported during the session wins over the condition given on return.
  await MaterielModel.updateOne(
    { _id: reservation.materiel, etat: { $ne: "EN_PANNE" } },
    { $set: { etat: input.etat } },
  );
}

/**
 * Breakdown (cahier: Materiel.signalerPanne()): the item becomes EN_PANNE and unavailable,
 * then everyone else holding a blocking reservation that is not over yet is notified.
 */
export async function signalerPanne(
  materielId: string,
  input: PanneInput,
  actor: Actor,
): Promise<{ notifies: number }> {
  await connectDB();
  const materiel = await MaterielModel.findById(materielId).lean<MaterielLean>();
  if (!materiel) throw new ServiceError("Equipment not found.");
  if (materiel.archive) throw new ServiceError("This equipment is archived.");
  if (materiel.etat === "EN_PANNE") {
    throw new ServiceError("This equipment is already reported out of order.");
  }
  await MaterielModel.updateOne(
    { _id: materiel._id },
    { $set: { etat: "EN_PANNE", disponible: false } },
  );

  const touchees = await ReservationMateriel.find(aVenirQuery(materiel._id))
    .sort({ dateDebut: 1 })
    .lean<ReservationLean[]>();
  const parUtilisateur = new Map<string, ReservationLean[]>();
  for (const r of touchees) {
    const userId = r.utilisateur.toString();
    if (userId === actor.id) continue; // the reporter already knows
    parUtilisateur.set(userId, [...(parUtilisateur.get(userId) ?? []), r]);
  }

  const envois = [...parUtilisateur].map(([utilisateurId, reservations]) =>
    createNotification({
      utilisateurId,
      type: "SYSTEME",
      titre: `${materiel.nom} is out of order`,
      message: `Reported problem: “${input.description}”. Affected reservation${reservations.length > 1 ? "s" : ""}: ${reservations
        .map((r) => `${r.seanceTitre} (${formatDateTime(r.dateDebut)})`)
        .join(", ")}. Please choose another item.`,
      lienCible: "/dashboard/materiel/reservations",
    }).then(
      () => true,
      (error: unknown) => {
        // The breakdown is recorded even if one notification fails.
        console.error(error);
        return false;
      },
    ),
  );
  const sent = await Promise.all(envois);
  return { notifies: sent.filter(Boolean).length };
}
