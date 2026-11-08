import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import {
  assertPhotosChangeAllowed,
  assertUploadAllowed,
} from "@/modules/snapseal/snapseal.guards";
import { Galerie } from "./galerie.model";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  type Photo as PhotoDTO,
  type StatutCulling,
  type StatutGalerie,
} from "./galerie.types";
import { Photo, type IPhoto } from "./photo.model";
import {
  deleteFiles,
  makeThumbnail,
  openFile,
  readFileChunks,
  saveFile,
  type StoredFile,
} from "./photo.storage";

/**
 * Gestion des Photos — business rules. Only this file and galerie.service.ts
 * touch the Photo / Galerie models; files go through photo.storage.ts.
 */

export const PHOTOS_LIBRARY_LIMIT = 500;

type PhotoLean = IPhoto & { _id: Types.ObjectId };

export function photoFileUrl(id: string, variant: "file" | "miniature"): string {
  return `/api/photos/${id}/${variant}`;
}

function toPhotoDTO(doc: PhotoLean): PhotoDTO {
  const id = doc._id.toString();
  return {
    id,
    galerieId: doc.galerie.toString(),
    nomFichier: doc.nomFichier,
    url: photoFileUrl(id, "file"),
    urlMiniature: photoFileUrl(id, "miniature"),
    format: doc.format,
    taille: doc.taille,
    datePrise: doc.datePrise?.toISOString(),
    scoreQualite: doc.scoreQualite,
    estFloue: doc.estFloue,
    yeuxFermes: doc.yeuxFermes ?? false,
    groupeDoublon: doc.groupeDoublon,
    tagsIA: doc.tagsIA,
    descriptionIA: doc.descriptionIA,
    statutAnalyseIA: doc.statutAnalyseIA ?? "EN_ATTENTE",
    statutCulling: doc.statutCulling,
    estFavori: doc.estFavori,
    commentaireClient: doc.commentaireClient,
    ordreHistoire: doc.ordreHistoire,
    styleApplique: doc.styleApplique,
    urlRetouchee: doc.urlRetouchee,
    estEditee: doc.estEditee ?? false,
    photoOrigineId: doc.photoOrigine?.toString(),
    dateUpload: doc.createdAt.toISOString(),
  };
}

export function toObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map(toObjectId).filter((id) => id !== null);
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listPhotosOfGalerie(galerieId: string): Promise<PhotoDTO[]> {
  const galerie = toObjectId(galerieId);
  if (!galerie) return [];
  await connectDB();
  const docs = await Photo.find({ galerie })
    .sort({ ordreHistoire: 1, createdAt: 1 })
    .lean<PhotoLean[]>();
  return docs.map(toPhotoDTO);
}

export async function getPhotoById(id: string): Promise<PhotoDTO | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  await connectDB();
  const doc = await Photo.findById(_id).lean<PhotoLean>();
  return doc ? toPhotoDTO(doc) : null;
}

/** Photo library: newest photos of every gallery. */
export async function listRecentPhotos(limit = PHOTOS_LIBRARY_LIMIT): Promise<PhotoDTO[]> {
  await connectDB();
  const docs = await Photo.find().sort({ createdAt: -1 }).limit(limit).lean<PhotoLean[]>();
  return docs.map(toPhotoDTO);
}

export type PhotoCounts = { total: number; favoris: number };

/** Photo / favorite counts per gallery (for gallery cards). */
export async function countPhotosByGalerie(
  galerieIds: Types.ObjectId[],
): Promise<Map<string, PhotoCounts>> {
  if (!galerieIds.length) return new Map();
  await connectDB();
  const rows = await Photo.aggregate<{ _id: Types.ObjectId; total: number; favoris: number }>([
    { $match: { galerie: { $in: galerieIds } } },
    {
      $group: {
        _id: "$galerie",
        total: { $sum: 1 },
        favoris: { $sum: { $cond: ["$estFavori", 1, 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), { total: r.total, favoris: r.favoris }]));
}

export async function countPhotosByCulling(): Promise<Record<StatutCulling, number>> {
  await connectDB();
  const rows = await Photo.aggregate<{ _id: StatutCulling; count: number }>([
    { $group: { _id: "$statutCulling", count: { $sum: 1 } } },
  ]);
  const counts = { RETENUE: 0, REJETEE: 0, EN_ATTENTE: 0 };
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

// ── Files (used by the /api/photos/[id]/… routes) ───────────────────────────

export type PhotoFileAccess = {
  galerieId: string;
  nomFichier: string;
  clientId: string;
  statutGalerie: StatutGalerie;
  telechargementAutorise: boolean;
  statutCulling: StatutCulling;
  open: () => Promise<StoredFile | null>;
};

/** What the file routes need to authorize, then stream, one variant of a photo. */
export async function getPhotoFileAccess(
  photoId: string,
  variant: "file" | "miniature",
): Promise<PhotoFileAccess | null> {
  const _id = toObjectId(photoId);
  if (!_id) return null;
  await connectDB();
  const photo = await Photo.findById(_id)
    .select("galerie nomFichier fichier miniature statutCulling")
    .lean<Pick<PhotoLean, "galerie" | "nomFichier" | "fichier" | "miniature" | "statutCulling">>();
  if (!photo) return null;
  const galerie = await Galerie.findById(photo.galerie)
    .select("client statut telechargementAutorise")
    .lean<{ client: Types.ObjectId; statut: StatutGalerie; telechargementAutorise: boolean }>();
  if (!galerie) return null;
  const fileId = variant === "file" ? photo.fichier : photo.miniature;
  return {
    galerieId: photo.galerie.toString(),
    nomFichier: photo.nomFichier,
    clientId: galerie.client.toString(),
    statutGalerie: galerie.statut,
    telechargementAutorise: galerie.telechargementAutorise,
    statutCulling: photo.statutCulling,
    open: () => openFile(fileId),
  };
}

export type DownloadablePhoto = { nomFichier: string; read: () => Promise<AsyncIterable<Buffer>> };

/** Originals of a gallery's non-rejected photos, for the "Download all" ZIP. */
export async function listDownloadablePhotos(
  galerieId: string,
  {
    includeRejected = false,
    onlyIds,
  }: { includeRejected?: boolean; onlyIds?: string[] } = {},
): Promise<DownloadablePhoto[]> {
  const galerie = toObjectId(galerieId);
  if (!galerie) return [];
  await connectDB();
  const filter: Record<string, unknown> = includeRejected
    ? { galerie }
    : { galerie, statutCulling: { $ne: "REJETEE" } };
  if (onlyIds) filter._id = { $in: toObjectIds(onlyIds) }; // SnapSeal: sealed photos only
  const docs = await Photo.find(filter)
    .sort({ ordreHistoire: 1, createdAt: 1 })
    .select("nomFichier fichier")
    .lean<Pick<PhotoLean, "nomFichier" | "fichier">[]>();
  return docs.map((doc) => ({
    nomFichier: doc.nomFichier,
    read: () => readFileChunks(doc.fichier),
  }));
}

export type PackagePhoto = DownloadablePhoto & { id: string; taille: number };

/**
 * SnapSeal delivery: the chosen photos of one gallery, in the given order. Ids from another
 * gallery are ignored, so a package can't take photos outside its gallery.
 */
export async function listPackagePhotos(
  galerieId: string,
  photoIds: string[],
): Promise<PackagePhoto[]> {
  const galerie = toObjectId(galerieId);
  if (!galerie) return [];
  await connectDB();
  const docs = await Photo.find({ galerie, _id: { $in: toObjectIds(photoIds) } })
    .select("nomFichier fichier taille")
    .lean<Pick<PhotoLean, "_id" | "nomFichier" | "fichier" | "taille">[]>();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return photoIds.flatMap((id) => {
    const doc = byId.get(id);
    return doc
      ? [{ id, nomFichier: doc.nomFichier, taille: doc.taille, read: () => readFileChunks(doc.fichier) }]
      : [];
  });
}

// ── Writes (staff — callers must check the area) ────────────────────────────

export type UploadedFile = { name: string; type: string; size: number; data: Buffer };

/** Set when the file comes from the Photo Editing page. */
export type PhotoEdition = { photoOrigineId: string; style?: string };

/**
 * What an edited photo inherits from the photo it was made from. It starts as kept (the
 * photographer chose to add it, and auto-cull must not reject it as a duplicate of its original)
 * and sits right after its original. Editing an edit links to the root original.
 */
async function editedPhotoFields(galerie: Types.ObjectId, edition: PhotoEdition) {
  const _id = toObjectId(edition.photoOrigineId);
  const source = _id
    ? await Photo.findOne({ _id, galerie })
        .select("photoOrigine datePrise ordreHistoire")
        .lean<Pick<PhotoLean, "_id" | "photoOrigine" | "datePrise" | "ordreHistoire">>()
    : null;
  if (!source) throw new ServiceError("The original photo is not in this gallery.");
  return {
    estEditee: true,
    photoOrigine: source.photoOrigine ?? source._id,
    statutCulling: "RETENUE" as const,
    datePrise: source.datePrise,
    ordreHistoire: source.ordreHistoire === undefined ? undefined : source.ordreHistoire + 0.5,
    styleApplique: edition.style?.trim().slice(0, 60) || undefined,
  };
}

/** Stores one photo (original + thumbnail in GridFS) and makes it the cover if none is set. */
export async function uploadPhoto(
  galerieId: string,
  file: UploadedFile,
  userId: string,
  edition?: PhotoEdition,
): Promise<PhotoDTO> {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new ServiceError(`${file.name}: only JPG, PNG and WebP files are accepted.`);
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new ServiceError(`${file.name}: ${PHOTO_MAX_BYTES / 1024 / 1024} MB maximum per file.`);
  }
  const galerie = toObjectId(galerieId);
  if (!galerie) throw new ServiceError("Gallery not found.");
  await connectDB();
  const galerieDoc = await Galerie.findById(galerie).select("photoCouverture").lean();
  if (!galerieDoc) throw new ServiceError("Gallery not found.");
  const edited = edition ? await editedPhotoFields(galerie, edition) : null;
  const editedFields = edited ?? {};
  // SnapSeal: a sealed required gallery only takes edited copies of its sealed photos.
  await assertUploadAllowed(galerie, edited?.photoOrigine);

  let miniatureData: Buffer;
  try {
    miniatureData = await makeThumbnail(file.data);
  } catch {
    throw new ServiceError(`${file.name}: this file is not a readable image.`);
  }

  const fichier = await saveFile(file.data, file.name, file.type);
  let miniature: Types.ObjectId | null = null;
  try {
    miniature = await saveFile(miniatureData, `thumb-${file.name}.webp`, "image/webp");
    const doc = await Photo.create({
      galerie,
      nomFichier: file.name,
      format: file.type,
      taille: file.size,
      fichier,
      miniature,
      uploadePar: new Types.ObjectId(userId),
      ...editedFields,
    });
    if (!galerieDoc.photoCouverture) {
      await Galerie.updateOne(
        { _id: galerie, photoCouverture: { $exists: false } },
        { $set: { photoCouverture: doc._id } },
      );
    }
    return toPhotoDTO(doc.toObject());
  } catch (error) {
    // Never leave orphan chunks behind a failed insert.
    await deleteFiles(miniature ? [fichier, miniature] : [fichier]);
    throw error;
  }
}

export async function setCulling(ids: string[], statut: StatutCulling): Promise<number> {
  await connectDB();
  const _ids = toObjectIds(ids);
  // SnapSeal: sealed photos of a required gallery keep their decision.
  await assertPhotosChangeAllowed(
    await Photo.find({ _id: { $in: _ids } })
      .select("galerie")
      .lean<Pick<PhotoLean, "_id" | "galerie">[]>(),
    "culling",
  );
  const result = await Photo.updateMany(
    { _id: { $in: _ids } },
    { $set: { statutCulling: statut } },
  );
  return result.modifiedCount;
}

/** Deletes photos and their files; a gallery whose cover is deleted falls back to another photo. */
export async function deletePhotos(ids: string[]): Promise<number> {
  await connectDB();
  const docs = await Photo.find({ _id: { $in: toObjectIds(ids) } })
    .select("galerie fichier miniature")
    .lean<Pick<PhotoLean, "_id" | "galerie" | "fichier" | "miniature">[]>();
  if (!docs.length) return 0;
  await assertPhotosChangeAllowed(docs, "delete"); // SnapSeal: sealed photos stay

  const photoIds = docs.map((d) => d._id);
  await Photo.deleteMany({ _id: { $in: photoIds } });
  await deleteFiles(docs.flatMap((d) => [d.fichier, d.miniature]));

  const galerieIds = [...new Set(docs.map((d) => d.galerie.toString()))].map(
    (id) => new Types.ObjectId(id),
  );
  const orphaned = await Galerie.find({
    _id: { $in: galerieIds },
    photoCouverture: { $in: photoIds },
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  for (const { _id } of orphaned) {
    const next = await Photo.findOne({ galerie: _id }).sort({ createdAt: 1 }).select("_id").lean();
    await Galerie.updateOne(
      { _id },
      next ? { $set: { photoCouverture: next._id } } : { $unset: { photoCouverture: "" } },
    );
  }
  return docs.length;
}

/** Used when a gallery is deleted (composition: its photos go with it). */
export async function deletePhotosOfGalerie(galerieId: Types.ObjectId): Promise<void> {
  await connectDB();
  const docs = await Photo.find({ galerie: galerieId })
    .select("fichier miniature")
    .lean<Pick<PhotoLean, "fichier" | "miniature">[]>();
  await Photo.deleteMany({ galerie: galerieId });
  await deleteFiles(docs.flatMap((d) => [d.fichier, d.miniature]));
}

export async function photoBelongsToGalerie(photoId: string, galerieId: string): Promise<boolean> {
  const _id = toObjectId(photoId);
  const galerie = toObjectId(galerieId);
  if (!_id || !galerie) return false;
  await connectDB();
  return (await Photo.exists({ _id, galerie })) !== null;
}
