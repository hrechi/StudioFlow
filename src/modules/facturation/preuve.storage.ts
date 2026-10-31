import "server-only";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";

/**
 * Payment proofs (transfer receipts, cheque photos…) are stored with GridFS in the bucket
 * `preuvesPaiement`; a declaration only keeps the file id. Same approach as photo.storage.ts.
 */
const BUCKET_NAME = "preuvesPaiement";

async function getBucket(): Promise<mongoose.mongo.GridFSBucket> {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function savePreuve(data: Buffer, filename: string, contentType: string): Promise<Types.ObjectId> {
  const bucket = await getBucket();
  const upload = bucket.openUploadStream(filename, { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

export async function openPreuve(id: Types.ObjectId) {
  const bucket = await getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return null;
  return {
    stream: Readable.toWeb(bucket.openDownloadStream(id)) as ReadableStream<Uint8Array>,
    contentType: (file.metadata?.contentType as string | undefined) ?? "application/octet-stream",
    length: file.length,
    filename: file.filename,
  };
}

export async function deletePreuve(id: Types.ObjectId) {
  const bucket = await getBucket();
  await bucket.delete(id).catch(() => undefined);
}
