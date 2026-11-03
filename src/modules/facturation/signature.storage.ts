import "server-only";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";

/**
 * The studio's signature and company stamp are stored with GridFS in the bucket `signaturesFactures`;
 * visaStudio only keeps the file ids. Same approach as preuve.storage.ts.
 */
const BUCKET_NAME = "signaturesFactures";

async function getBucket(): Promise<mongoose.mongo.GridFSBucket> {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function saveSignatureImage(data: Buffer, filename: string): Promise<Types.ObjectId> {
  const bucket = await getBucket();
  const upload = bucket.openUploadStream(filename, { metadata: { contentType: "image/png" } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

/** The whole image, for embedding in the invoice PDF. Null when the file no longer exists. */
export async function readSignatureImage(id: Types.ObjectId): Promise<Uint8Array | null> {
  const bucket = await getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(id)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteSignatureImage(id: Types.ObjectId) {
  const bucket = await getBucket();
  await bucket.delete(id).catch(() => undefined);
}
