import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  portfolioIndexMigration?: Promise<void>;
};

// Cached on globalThis so `next dev` hot reloads reuse one connection.
const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.mongooseCache ??= { conn: null, promise: null });

const obsoletePortfolioIndex = {
  statut: 1,
  visibilite: 1,
  styles: 1,
  services: 1,
  disponible: 1,
};

async function removeObsoletePortfolioIndex(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is not initialized.");
  const collectionExists = await db
    .listCollections({ name: "portfolios" }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) return;

  const collection = db.collection("portfolios");
  const indexes = await collection.indexes();

  // Drop any index that covers both `styles` AND `services` arrays together
  // — MongoDB forbids indexing two parallel arrays in a single compound index.
  const toRemove = indexes.filter((index) => {
    const keys = Object.keys(index.key);
    return keys.includes("styles") && keys.includes("services");
  });
  for (const idx of toRemove) {
    if (idx.name) {
      await collection.dropIndex(idx.name).catch(() => {
        /* ignore if already removed */
      });
    }
  }

  // Also drop the original obsolete combined index if it somehow still exists.
  const obsoleteIndex = indexes.find(
    (index) =>
      JSON.stringify(Object.entries(index.key).sort(([a], [b]) => a.localeCompare(b))) ===
      JSON.stringify(
        Object.entries(obsoletePortfolioIndex).sort(([a], [b]) => a.localeCompare(b)),
      ),
  );
  if (obsoleteIndex?.name) {
    await collection.dropIndex(obsoleteIndex.name).catch(() => {
      /* ignore if already removed */
    });
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!cache.conn) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
    }

    cache.promise ??= mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });

    try {
      cache.conn = await cache.promise;
    } catch (error) {
      cache.promise = null;
      throw error;
    }
  }

  cache.portfolioIndexMigration ??= removeObsoletePortfolioIndex().catch((error: unknown) => {
    cache.portfolioIndexMigration = undefined;
    throw error;
  });
  await cache.portfolioIndexMigration;
  return cache.conn;
}
