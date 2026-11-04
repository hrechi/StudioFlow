import "server-only";

import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { MATERIEL_PHOTO_MAX_BYTES, processMaterielPhoto } from "./materiel-photo.processing";

export { MATERIEL_PHOTO_MAX_BYTES, processMaterielPhoto };
const BUCKET_NAME = "materielPhotos";

async function getBucket(): Promise<mongoose.mongo.GridFSBucket> {
  const connection = await connectDB();
  const db = connection.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function saveMaterielPhoto(
  data: Buffer,
  equipmentId: string,
): Promise<Types.ObjectId> {
  const bucket = await getBucket();
  const upload = bucket.openUploadStream(`materiel-${equipmentId}.webp`, {
    metadata: { contentType: "image/webp", equipmentId },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

export async function openMaterielPhoto(id: Types.ObjectId) {
  const bucket = await getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return null;
  return {
    stream: Readable.toWeb(bucket.openDownloadStream(id)) as ReadableStream<Uint8Array>,
    contentType: "image/webp",
    length: file.length,
  };
}

export async function deleteMaterielPhoto(id?: Types.ObjectId): Promise<void> {
  if (!id) return;
  const bucket = await getBucket();
  await bucket.delete(id).catch((error: unknown) => {
    if (!(error instanceof Error && /FileNotFound|File not found/i.test(error.message))) {
      throw error;
    }
  });
}
