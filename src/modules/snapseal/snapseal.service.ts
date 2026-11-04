import "server-only";
import { createHash } from "node:crypto";
import { isAddress } from "ethers";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import {
  getPhotoFileAccess,
  listPhotosOfGalerie,
  toObjectId,
} from "@/modules/photos-galeries/photo.service";
import { GalerieSeal, type IGalerieSeal } from "./snapseal.model";
import {
  SNAPSEAL_MAX_PHOTOS,
  SNAPSEAL_NETWORKS,
  type GalerieSealDTO,
  type SealedPhoto,
  type SnapSealConfig,
} from "./snapseal.types";

/** Read at request time, so setting the addresses only needs a restart, not a rebuild. */
export function getSnapSealConfig(): SnapSealConfig | null {
  const registryAddress = process.env.SNAPSEAL_REGISTRY_ADDRESS?.trim() ?? "";
  const deliveryAddress = process.env.SNAPSEAL_DELIVERY_ADDRESS?.trim() ?? "";
  if (!isAddress(registryAddress) || !isAddress(deliveryAddress)) return null;
  const network =
    process.env.SNAPSEAL_NETWORK?.trim().toLowerCase() === "ganache"
      ? SNAPSEAL_NETWORKS.ganache
      : SNAPSEAL_NETWORKS.sepolia;
  return {
    registryAddress,
    deliveryAddress,
    ...network,
    rpcUrl: process.env.SNAPSEAL_RPC_URL?.trim() || network.rpcUrl,
  };
}

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
  };
}

export async function recordGalerieSeal(input: {
  galerieId: string;
  registryAddress: string;
  onChainId: number;
  txHash: string;
  photos: SealedPhoto[];
}): Promise<void> {
  const galerie = toObjectId(input.galerieId);
  if (!galerie) throw new ServiceError("Gallery not found.");
  await connectDB();
  try {
    await GalerieSeal.create({
      galerie,
      registryAddress: input.registryAddress.toLowerCase(),
      onChainId: input.onChainId,
      txHash: input.txHash,
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
