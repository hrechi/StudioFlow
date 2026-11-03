import "server-only";
import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { PLACEHOLDER_IMAGE } from "@/lib/mock-images";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { hashPassword, verifyPassword } from "@/modules/utilisateurs/password";
import {
  findUtilisateurById,
  findUtilisateurRefs,
} from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { Galerie, type IGalerie } from "./galerie.model";
import type {
  GalerieCreateInput,
  GalerieListQuery,
  GalerieShareInput,
  GalerieUpdateInput,
} from "./galerie.schemas";
import type { Galerie as GalerieDTO, StatutGalerie } from "./galerie.types";
import {
  countPhotosByGalerie,
  deletePhotosOfGalerie,
  photoBelongsToGalerie,
  photoFileUrl,
  toObjectId,
  type PhotoCounts,
} from "./photo.service";

/**
 * Gestion des Galeries — business rules. Pages and actions use this service;
 * other modules too (never the Galerie model).
 */

type GalerieLean = IGalerie & { _id: Types.ObjectId };

const UNKNOWN_CLIENT: Omit<UtilisateurRef, "id"> = { prenom: "Deleted", nom: "client" };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "YYYY-MM-DD" → end of that day (the gallery stays open the whole day). */
function toExpiryDate(value: string): Date {
  return new Date(`${value}T23:59:59`);
}

export function galerieClientPath(id: string): string {
  return `/espace-client/galeries/${id}`;
}

/** Public share link (front office), opened by guests with the gallery password. */
export function galeriePublicPath(token: string): string {
  return `/g/${token}`;
}

function toGalerieDTO(
  doc: GalerieLean,
  clients: Map<string, UtilisateurRef>,
  counts: Map<string, PhotoCounts>,
): GalerieDTO {
  const id = doc._id.toString();
  const clientId = doc.client.toString();
  const count = counts.get(id) ?? { total: 0, favoris: 0 };
  return {
    id,
    titre: doc.titre,
    categorie: doc.categorie,
    photoCouverture: doc.photoCouverture
      ? photoFileUrl(doc.photoCouverture.toString(), "miniature")
      : PLACEHOLDER_IMAGE,
    lienAcces: galeriePublicPath(doc.lienAcces),
    protegeeParMotDePasse: !!doc.motDePasse,
    dateExpiration: doc.dateExpiration.toISOString(),
    telechargementAutorise: doc.telechargementAutorise,
    statut: doc.statut,
    dateCreation: doc.createdAt.toISOString(),
    seance: doc.seance ? { id: doc.seance.toString() } : undefined,
    client: clients.get(clientId) ?? { id: clientId, ...UNKNOWN_CLIENT },
    nombrePhotos: count.total,
    nombreSelection: count.favoris,
  };
}

/** Lean docs → DTOs with one query for the clients and one for the photo counts. */
async function toGalerieDTOs(docs: GalerieLean[]): Promise<GalerieDTO[]> {
  const [clients, counts] = await Promise.all([
    findUtilisateurRefs(docs.map((d) => d.client.toString())),
    countPhotosByGalerie(docs.map((d) => d._id)),
  ]);
  return docs.map((doc) => toGalerieDTO(doc, clients, counts));
}

// `motDePasse` is select:false; this projection only tells whether one is set.
const WITH_PASSWORD = "+motDePasse";

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listGaleries(query: Partial<GalerieListQuery> = {}): Promise<GalerieDTO[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.statut) filter.statut = query.statut;
  if (query.q) filter.titre = new RegExp(escapeRegex(query.q), "i");
  const docs = await Galerie.find(filter)
    .select(WITH_PASSWORD)
    .sort({ createdAt: -1 })
    .lean<GalerieLean[]>();
  return toGalerieDTOs(docs);
}

export async function getGalerieById(id: string): Promise<GalerieDTO | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  await connectDB();
  const doc = await Galerie.findById(_id).select(WITH_PASSWORD).lean<GalerieLean>();
  if (!doc) return null;
  const [dto] = await toGalerieDTOs([doc]);
  return dto;
}

/** Galleries a client may see: theirs, once shared (not while the studio is culling). */
export async function listGaleriesOfClient(clientId: string): Promise<GalerieDTO[]> {
  const client = toObjectId(clientId);
  if (!client) return [];
  await connectDB();
  const docs = await Galerie.find({ client, statut: { $ne: "EN_TRI" } })
    .select(WITH_PASSWORD)
    .sort({ createdAt: -1 })
    .lean<GalerieLean[]>();
  return toGalerieDTOs(docs);
}

export async function getGalerieOfClient(
  clientId: string,
  galerieId: string,
): Promise<GalerieDTO | null> {
  const galerie = await getGalerieById(galerieId);
  if (!galerie || galerie.client.id !== clientId || galerie.statut === "EN_TRI") return null;
  return galerie;
}

export async function countGaleriesByStatut(): Promise<Record<StatutGalerie, number>> {
  await connectDB();
  const rows = await Galerie.aggregate<{ _id: StatutGalerie; count: number }>([
    { $group: { _id: "$statut", count: { $sum: 1 } } },
  ]);
  const counts = { EN_TRI: 0, PARTAGEE: 0, VALIDEE: 0, LIVREE: 0 };
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

// ── Guest access (public /g/<lienAcces> link — no account) ──────────────────

export type SharedGalerie =
  { status: "ok"; galerie: GalerieDTO; passwordHash: string | null } | { status: "unavailable" };

/**
 * A gallery a guest may open with its link: shared (not in culling) and not
 * expired. Missing, unshared and expired galleries all look the same to a guest.
 */
export async function findSharedGalerie(token: string): Promise<SharedGalerie> {
  await connectDB();
  const doc = await Galerie.findOne({ lienAcces: token }).select(WITH_PASSWORD).lean<GalerieLean>();
  if (!doc || doc.statut === "EN_TRI" || doc.dateExpiration.getTime() < Date.now()) {
    return { status: "unavailable" };
  }
  const [galerie] = await toGalerieDTOs([doc]);
  return { status: "ok", galerie, passwordHash: doc.motDePasse ?? null };
}

/** Checks the gallery password; a gallery without password always passes. */
export async function checkGaleriePassword(
  passwordHash: string | null,
  password: string,
): Promise<boolean> {
  if (!passwordHash) return true;
  if (!password) return false;
  return verifyPassword(password, passwordHash);
}

// ── Writes (staff — callers must check the area) ────────────────────────────

async function assertClient(clientId: string): Promise<void> {
  const client = await findUtilisateurById(clientId);
  if (!client || client.role !== "CLIENT") {
    throw new ServiceError("Choose an existing client.", "clientId");
  }
}

async function getDocOrThrow(id: string): Promise<GalerieLean> {
  const _id = toObjectId(id);
  if (!_id) throw new ServiceError("Gallery not found.");
  await connectDB();
  const doc = await Galerie.findById(_id).select(WITH_PASSWORD).lean<GalerieLean>();
  if (!doc) throw new ServiceError("Gallery not found.");
  return doc;
}

async function notifyShared(doc: Pick<GalerieLean, "_id" | "client" | "titre">): Promise<void> {
  await createNotification({
    utilisateurId: doc.client.toString(),
    titre: "Your gallery is ready",
    message: `“${doc.titre}” is available: pick your favorites and approve your selection.`,
    type: "GALERIE",
    lienCible: galerieClientPath(doc._id.toString()),
  });
}

export async function createGalerie(input: GalerieCreateInput): Promise<GalerieDTO> {
  await assertClient(input.clientId);
  await connectDB();
  const doc = await Galerie.create({
    titre: input.titre,
    categorie: input.categorie,
    client: new Types.ObjectId(input.clientId),
    dateExpiration: toExpiryDate(input.dateExpiration),
    telechargementAutorise: input.telechargementAutorise,
    lienAcces: randomBytes(12).toString("base64url"),
    ...(input.motDePasse ? { motDePasse: await hashPassword(input.motDePasse) } : {}),
  });
  const [dto] = await toGalerieDTOs([doc.toObject()]);
  return dto;
}

export async function updateGalerie(id: string, input: GalerieUpdateInput): Promise<GalerieDTO> {
  const before = await getDocOrThrow(id);
  if (input.clientId !== before.client.toString()) await assertClient(input.clientId);

  const doc = await Galerie.findByIdAndUpdate(
    before._id,
    {
      $set: {
        titre: input.titre,
        categorie: input.categorie,
        client: new Types.ObjectId(input.clientId),
        statut: input.statut,
      },
    },
    { returnDocument: "after", runValidators: true },
  )
    .select(WITH_PASSWORD)
    .lean<GalerieLean>();
  if (!doc) throw new ServiceError("Gallery not found.");
  if (before.statut === "EN_TRI" && doc.statut === "PARTAGEE") await notifyShared(doc);
  const [dto] = await toGalerieDTOs([doc]);
  return dto;
}

/**
 * Saves the share settings. With `partager`, a gallery still in culling moves
 * to PARTAGEE and the client is notified.
 */
export async function updateGalerieSharing(
  id: string,
  input: GalerieShareInput,
  partager: boolean,
): Promise<GalerieDTO> {
  const before = await getDocOrThrow(id);
  const sharing = partager && before.statut === "EN_TRI";

  const $set: Record<string, unknown> = {
    dateExpiration: toExpiryDate(input.dateExpiration),
    telechargementAutorise: input.telechargementAutorise,
    ...(sharing ? { statut: "PARTAGEE" } : {}),
  };
  if (!input.retirerMotDePasse && input.motDePasse) {
    $set.motDePasse = await hashPassword(input.motDePasse);
  }
  const doc = await Galerie.findByIdAndUpdate(
    before._id,
    { $set, ...(input.retirerMotDePasse ? { $unset: { motDePasse: "" } } : {}) },
    { returnDocument: "after", runValidators: true },
  )
    .select(WITH_PASSWORD)
    .lean<GalerieLean>();
  if (!doc) throw new ServiceError("Gallery not found.");
  if (sharing) await notifyShared(doc);
  const [dto] = await toGalerieDTOs([doc]);
  return dto;
}

export async function setCouverture(galerieId: string, photoId: string): Promise<void> {
  const doc = await getDocOrThrow(galerieId);
  if (!(await photoBelongsToGalerie(photoId, galerieId))) {
    throw new ServiceError("This photo is not in the gallery.");
  }
  await Galerie.updateOne(
    { _id: doc._id },
    { $set: { photoCouverture: new Types.ObjectId(photoId) } },
  );
}

/** Deletes the gallery with its photos and their files (composition). */
export async function deleteGalerie(id: string): Promise<void> {
  const doc = await getDocOrThrow(id);
  await deletePhotosOfGalerie(doc._id);
  await Galerie.deleteOne({ _id: doc._id });
}
