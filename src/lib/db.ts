import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cached on globalThis so `next dev` hot reloads reuse one connection.
const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.mongooseCache ??= { conn: null, promise: null });

/**
 * Hard deadline for the entire connection attempt (including DNS SRV/TXT
 * resolution for mongodb+srv URIs). Node's OS DNS stack can take 75-90 s
 * before surfacing ETIMEOUT — this ensures a fast, readable error instead.
 */
const CONNECT_DEADLINE_MS = 10_000;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }

  if (!cache.promise) {
    const connectPromise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 8_000,
    });

    const deadlinePromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `MongoDB connection timed out after ${CONNECT_DEADLINE_MS / 1000} s. ` +
                "Check your Atlas IP whitelist and network access.",
            ),
          ),
        CONNECT_DEADLINE_MS,
      ),
    );

    cache.promise = Promise.race([connectPromise, deadlinePromise]);
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
