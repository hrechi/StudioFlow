import "server-only";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import sharp from "sharp";
import { connectDB } from "@/lib/db";

/**
 * Image bytes are stored in MongoDB with GridFS (bucket `photoFiles`:
 * collections `photoFiles.files` + `photoFiles.chunks`). A Photo document only
 * keeps the GridFS ids. Only the photo service and the file routes use this.
 */

const BUCKET_NAME = "photoFiles";
const THUMBNAIL_WIDTH = 640;

async function getBucket(): Promise<mongoose.mongo.GridFSBucket> {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function saveFile(
  data: Buffer,
  filename: string,
  contentType: string,
): Promise<Types.ObjectId> {
  const bucket = await getBucket();
  const upload = bucket.openUploadStream(filename, { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

export type StoredFile = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  length: number;
};

/** Opens a stored file as a web stream (for a Route Handler Response), or null if missing. */
export async function openFile(id: Types.ObjectId): Promise<StoredFile | null> {
  const bucket = await getBucket();
  const [file] = await bucket.find({ _id: id }).limit(1).toArray();
  if (!file) return null;
  const nodeStream = bucket.openDownloadStream(id);
  return {
    stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
    contentType: (file.metadata?.contentType as string | undefined) ?? "application/octet-stream",
    length: file.length,
  };
}

/** Reads a stored file chunk by chunk (Node stream), e.g. to add it to a ZIP. */
export async function readFileChunks(id: Types.ObjectId): Promise<AsyncIterable<Buffer>> {
  const bucket = await getBucket();
  return bucket.openDownloadStream(id);
}

/** Deletes stored files; ids that no longer exist are ignored. */
export async function deleteFiles(ids: Types.ObjectId[]): Promise<void> {
  if (!ids.length) return;
  const bucket = await getBucket();
  await Promise.all(
    ids.map((id) =>
      bucket.delete(id).catch((error: unknown) => {
        if (!(error instanceof Error && /FileNotFound|File not found/i.test(error.message))) {
          throw error;
        }
      }),
    ),
  );
}

/** Builds a WebP thumbnail (EXIF rotation applied). Throws if the bytes are not an image. */
export async function makeThumbnail(data: Buffer): Promise<Buffer> {
  return sharp(data)
    .rotate()
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
