import "server-only";
import { createHash } from "node:crypto";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import {
  getPhotoFileAccess,
  listPhotosOfGalerie,
  toObjectId,
} from "@/modules/photos-galeries/photo.service";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { getUtilisateurWallet } from "@/modules/utilisateurs/utilisateur.service";
import { GalerieSeal, type IGalerieSeal } from "./snapseal.model";
import { readSealReceipt } from "./snapseal.server-chain";
import {
  SNAPSEAL_MAX_PHOTOS,
  type GalerieSealDTO,
  type SealedPhoto,
  type SnapSealConfig,
} from "./snapseal.types";

export { getSnapSealConfig } from "./snapseal.config";

async function hashPhotoFile(photoId: string): Promise<string> {
  const file = await (await getPhotoFileAccess(photoId, "file"))?.open();
  if (!file) throw new ServiceError("A photo file is missing from the gallery.");
  const hash = createHash("sha256");
  const reader = file.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
  }
  return `0x${hash.digest("hex")}`;
}

/**
 * Fingerprints of the original files of the photos the client can see. Two identical
 * files share one fingerprint, and the contract accepts each fingerprint only once.
 */
export async function computeGalerieHashes(galerieId: string): Promise<SealedPhoto[]> {
  const photos = (await listPhotosOfGalerie(galerieId)).filter(
    (photo) => photo.statutCulling !== "REJETEE",
  );
  if (!photos.length) throw new ServiceError("This gallery has no photo to seal.");

  const byHash = new Map<string, SealedPhoto>();
  for (const photo of photos) {
    const hash = await hashPhotoFile(photo.id);
    if (!byHash.has(hash))
      byHash.set(hash, { photoId: photo.id, nomFichier: photo.nomFichier, hash });
  }
  if (byHash.size > SNAPSEAL_MAX_PHOTOS) {
    throw new ServiceError(
      `A sealed gallery is limited to ${SNAPSEAL_MAX_PHOTOS} photos (this one has ${byHash.size}).`,
    );
  }
  return [...byHash.values()];
}

export async function getGalerieSeal(
  galerieId: string,
  registryAddress: string,
): Promise<GalerieSealDTO | null> {
  const galerie = toObjectId(galerieId);
  if (!galerie) return null;
  await connectDB();
  const doc = await GalerieSeal.findOne({
    galerie,
    registryAddress: registryAddress.toLowerCase(),
  }).lean<IGalerieSeal>();
  if (!doc) return null;
  return {
    onChainId: doc.onChainId,
    txHash: doc.txHash,
    photos: doc.photos.map((p) => ({
      photoId: p.photo.toString(),
      nomFichier: p.nomFichier,
      hash: p.hash,
    })),
    clientWallet: doc.clientWallet,
    selectionAt: doc.selectionAt?.toISOString(),
    selectedHashes: doc.selectedHashes ?? [],
    deliveredAt: doc.deliveredAt?.toISOString(),
    deliveryHash: doc.deliveryHash,
    confirmedAt: doc.confirmedAt?.toISOString(),
    livraison: doc.livraison
      ? {
          nomFichier: doc.livraison.nomFichier,
          taille: doc.livraison.taille,
          hash: doc.livraison.hash,
          photoIds: doc.livraison.photos.map((id) => id.toString()),
          creeLe: doc.livraison.creeLe.toISOString(),
        }
      : undefined,
  };
}

/**
 * Records the seal of a gallery from a transaction hash alone. The receipt is read from the
 * chain by the server: the event must come from OUR registry, its client must be the gallery
 * client's linked wallet (required galleries), and its fingerprints must be exactly this
 * gallery's photos right now. The on-chain id is the event's, never the browser's.
 */
export async function verifyAndRecordSeal(
  config: SnapSealConfig,
  galerieId: string,
  txHash: string,
): Promise<void> {
  const galerie = await getGalerieById(galerieId);
  if (!galerie) throw new ServiceError("Gallery not found.");

  const receipt = await readSealReceipt(config, txHash);
  if (galerie.preuveBlockchainRequise) {
    const wallet = await getUtilisateurWallet(galerie.client.id);
    if (!wallet || wallet !== receipt.client) {
      throw new ServiceError("This seal was made for another wallet than the client's linked one.");
    }
  }
  const photos = await computeGalerieHashes(galerie.id);
  const expected = new Set(photos.map((p) => p.hash.toLowerCase()));
  const published = new Set(receipt.hashes);
  if (expected.size !== published.size || [...expected].some((h) => !published.has(h))) {
    throw new ServiceError(
      "The fingerprints on the blockchain don't match this gallery's photos. Was a photo changed while sealing?",
    );
  }

  await recordGalerieSeal({
    galerieId: galerie.id,
    registryAddress: config.registryAddress,
    onChainId: receipt.onChainId,
    txHash,
    photos,
    photographerWallet: receipt.photographer,
    clientWallet: receipt.client,
  });
}

export async function recordGalerieSeal(input: {
  galerieId: string;
  registryAddress: string;
  onChainId: number;
  txHash: string;
  photos: SealedPhoto[];
  photographerWallet: string;
  clientWallet: string;
}): Promise<void> {
  const galerie = toObjectId(input.galerieId);
  if (!galerie) throw new ServiceError("Gallery not found.");
  await connectDB();
  const registryAddress = input.registryAddress.toLowerCase();
  // One on-chain gallery seals one Reframe gallery, never two.
  if (await GalerieSeal.exists({ registryAddress, onChainId: input.onChainId })) {
    throw new ServiceError(`On-chain gallery #${input.onChainId} is already linked to a gallery.`);
  }
  try {
    await GalerieSeal.create({
      galerie,
      registryAddress,
      onChainId: input.onChainId,
      txHash: input.txHash,
      photographerWallet: input.photographerWallet,
      clientWallet: input.clientWallet,
      photos: input.photos.map((p) => ({
        photo: toObjectId(p.photoId) ?? undefined,
        nomFichier: p.nomFichier,
        hash: p.hash,
      })),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ServiceError("This gallery is already sealed.");
    }
    throw error;
  }
}
