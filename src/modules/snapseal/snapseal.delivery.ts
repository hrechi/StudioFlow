import "server-only";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { Zip, ZipPassThrough } from "fflate";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { listPackagePhotos, type PackagePhoto } from "@/modules/photos-galeries/photo.service";
import { deleteFiles, saveStream } from "@/modules/photos-galeries/photo.storage";
import { syncGalerieProof } from "./snapseal.guards";
import { GalerieSeal } from "./snapseal.model";
import type { LivraisonDTO } from "./snapseal.types";

/**
 * The delivery package: instead of a file from the photographer's computer, a ZIP of photos
 * chosen in the gallery (usually the retouched copies of the client's selection). It is built
 * and stored HERE, and its fingerprint is computed by the server over the stored bytes (D10),
 * so the client downloads exactly the file whose hash is on-chain.
 */

export const DELIVERY_MAX_BYTES = 500 * 1024 * 1024;

/** Same file name twice in the package → "name (2).jpg". */
function uniqueName(name: string, used: Map<string, number>): string {
  const count = (used.get(name) ?? 0) + 1;
  used.set(name, count);
  if (count === 1) return name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
}

/** The ZIP as a stream of chunks (photos are already compressed: entries are stored). */
function zipStream(photos: PackagePhoto[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) return controller.error(error);
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const used = new Map<string, number>();
      try {
        for (const photo of photos) {
          const entry = new ZipPassThrough(uniqueName(photo.nomFichier, used));
          zip.add(entry);
          for await (const chunk of await photo.read()) entry.push(new Uint8Array(chunk));
          entry.push(new Uint8Array(0), true);
        }
        zip.end();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function safeFileName(titre: string): string {
  return `${titre.replace(/[\/:*?"<>|]+/g, "-").trim() || "gallery"} - delivery.zip`;
}

/**
 * Builds and stores the package for a sealed gallery whose selection is verified and whose
 * delivery is not on-chain yet. Replacing an unpublished package deletes the old file.
 * The chain is read first: if it can't be, nothing is built (fail closed).
 */
export async function buildDeliveryPackage(
  galerieId: string,
  photoIds: string[],
): Promise<LivraisonDTO> {
  const ctx = await syncGalerieProof(galerieId);
  const seal = ctx.seal;
  if (!seal) throw new ServiceError("Seal this gallery first.");
  if (!seal.selectionAt) {
    throw new ServiceError("The client hasn't validated their selection on the blockchain yet.");
  }
  if (seal.deliveredAt) {
    throw new ServiceError("The delivery is already published on the blockchain: it can't change.");
  }

  const ids = [...new Set(photoIds)];
  const photos = await listPackagePhotos(ctx.galerie._id.toString(), ids);
  if (!photos.length) throw new ServiceError("Choose at least one photo of this gallery.");
  if (photos.length !== ids.length) throw new ServiceError("Some photos are not in this gallery.");
  const total = photos.reduce((sum, p) => sum + p.taille, 0);
  if (total > DELIVERY_MAX_BYTES) {
    throw new ServiceError(`The delivery is limited to ${DELIVERY_MAX_BYTES / 1024 / 1024} MB.`);
  }

  const nomFichier = safeFileName(ctx.galerie.titre);
  const hash = createHash("sha256");
  const zip = Readable.fromWeb(zipStream(photos) as WebReadableStream<Uint8Array>);
  const saved = await saveStream(zip, nomFichier, "application/zip", (chunk) => hash.update(chunk));
  const livraison = {
    fichier: saved.id,
    nomFichier,
    taille: saved.length,
    contentType: "application/zip",
    hash: `0x${hash.digest("hex")}`,
    photos: photos.map((p) => new Types.ObjectId(p.id)),
    creeLe: new Date(),
  };

  await connectDB();
  // Only while no delivery is on-chain: a published package never changes.
  const updated = await GalerieSeal.findOneAndUpdate(
    { _id: seal._id, deliveredAt: { $exists: false } },
    { $set: { livraison } },
    { returnDocument: "before" },
  ).lean();
  if (!updated) {
    await deleteFiles([saved.id]);
    throw new ServiceError("The delivery was published meanwhile: it can't change.");
  }
  if (updated.livraison) await deleteFiles([updated.livraison.fichier]);

  return {
    nomFichier,
    taille: saved.length,
    hash: livraison.hash,
    photoIds: photos.map((p) => p.id),
    creeLe: livraison.creeLe.toISOString(),
  };
}
