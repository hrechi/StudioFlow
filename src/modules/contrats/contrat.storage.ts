import "server-only";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * GridFS : sauvegarde et lecture des PDFs figés (bucket "contratsFiges").
 * Même pattern que preuve.storage.ts dans le module facturation.
 */
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";

const BUCKET_NAME = "contratsFiges";

async function getBucket(): Promise<mongoose.mongo.GridFSBucket> {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

/** Save a PDF buffer and return its GridFS ObjectId. */
export async function saveContratPdf(data: Buffer, filename: string): Promise<Types.ObjectId> {
  const bucket = await getBucket();
  const upload = bucket.openUploadStream(filename, {
    metadata: { contentType: "application/pdf" },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

/** Read a frozen PDF by its GridFS id. Returns null if not found. */
export async function readContratPdf(id: Types.ObjectId): Promise<Buffer | null> {
  const bucket = await getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(id)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** Delete a PDF from GridFS (used when a draft is deleted before freezing). */
export async function deleteContratPdf(id: Types.ObjectId): Promise<void> {
  const bucket = await getBucket();
  await bucket.delete(id).catch(() => {/* already deleted */});
}
