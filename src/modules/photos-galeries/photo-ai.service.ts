/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import {
  ClaudeUnavailableError,
  claudeJson,
  isClaudeConfigured,
  type ClaudeImage,
} from "@/lib/llm-claude";
import { Photo, type IPhoto } from "./photo.model";
import { openFile } from "./photo.storage";

/**
 * AI features of the Photos & Galleries module, run by Claude Haiku 5.5 (src/lib/llm-claude.ts)
 * on the 640 px WebP thumbnails (cheap and fast; enough to judge sharpness and content):
 * - analysePhoto: tags, description, quality score, blur, closed eyes (run after each upload);
 * - autoCullGalerie: analyses what is missing, spots near-duplicates, keeps / rejects the
 *   photos still pending (never overrides a choice made by hand);
 * - storyOrderGalerie: narrative order of the kept photos (ordreHistoire);
 * - searchPhotos: natural-language search over the AI descriptions and tags.
 */

/** Photos at or above this score are recommended; below the reject threshold they are culled. */
export const AI_KEEP_SCORE = 45;
const BATCH_MAX = 60; // photos per multi-image request (duplicates, story order)
const ANALYSIS_CONCURRENCY = 4;

type PhotoLean = IPhoto & { _id: Types.ObjectId };

function requireClaude() {
  if (!isClaudeConfigured()) {
    throw new ServiceError(
      "AI features need ANTHROPIC_API_KEY (Claude) in the server environment.",
    );
  }
}

function toServiceError(error: unknown): never {
  if (error instanceof ClaudeUnavailableError) throw new ServiceError(error.message);
  throw error;
}

function galerieId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ServiceError("Gallery not found.");
  return new Types.ObjectId(id);
}

async function readThumbnail(photo: Pick<PhotoLean, "miniature">): Promise<Buffer | null> {
  const file = await openFile(photo.miniature);
  if (!file) return null;
  return Buffer.from(await new Response(file.stream).arrayBuffer());
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── 1. Single photo analysis ────────────────────────────────────────────────

const analysisSchema = z.object({
  description: z.string().describe("One factual sentence describing the photo, max 25 words."),
  tags: z
    .array(z.string())
    .describe("6 to 12 lowercase English tags: people, setting, objects, activity, mood, light."),
  qualityScore: z
    .number()
    .describe("Overall technical and artistic quality for a professional studio, 0 to 100."),
  sharpness: z.number().describe("Sharpness of the main subject, 0 (very blurry) to 100 (crisp)."),
  eyesClosed: z
    .boolean()
    .describe(
      "True only for an accidental blink that spoils the shot. False when closed eyes are intended: a kiss, laughter, prayer, an emotional or candid moment, looking down, a sleeping baby.",
    ),
});

const ANALYSIS_SYSTEM = `You are the culling assistant of ReFrame, a professional photography studio
(weddings, portraits, products, events). You judge photos the way a senior photographer would
when choosing what a client sees. Be strict but fair: a technically clean, well-composed,
expressive photo scores 80+; an ordinary but usable photo 55-75; missed focus, motion blur,
bad exposure, accidental closed eyes or awkward framing score below 45.`;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Analyses one photo and stores the result. Errors are recorded on the photo, not thrown. */
export async function analysePhoto(photoId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(photoId) || !isClaudeConfigured()) return false;
  await connectDB();
  const photo = await Photo.findById(photoId).select("miniature nomFichier").lean<PhotoLean>();
  if (!photo) return false;
  try {
    const data = await readThumbnail(photo);
    if (!data) throw new ClaudeUnavailableError("Thumbnail not found.");
    const result = await claudeJson({
      system: ANALYSIS_SYSTEM,
      prompt: "Analyse this photo for culling and search.",
      images: [{ data, mediaType: "image/webp" }],
      schema: analysisSchema,
      maxTokens: 2000,
    });
    const tags = [...new Set(result.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    await Photo.updateOne(
      { _id: photo._id },
      {
        $set: {
          descriptionIA: result.description.trim().slice(0, 500),
          tagsIA: tags.slice(0, 12),
          scoreQualite: clamp(result.qualityScore),
          estFloue: clamp(result.sharpness) < 40,
          yeuxFermes: result.eyesClosed,
          statutAnalyseIA: "TERMINEE",
          dateAnalyseIA: new Date(),
        },
      },
    );
    return true;
  } catch (error) {
    console.error(`[photo-ai] analysis failed for ${photo.nomFichier}:`, (error as Error).message);
    await Photo.updateOne({ _id: photo._id }, { $set: { statutAnalyseIA: "ECHOUEE" } });
    return false;
  }
}

/** Analyses every photo of a gallery that has no successful analysis yet. */
export async function analyseGalerie(id: string): Promise<{ analysed: number; failed: number }> {
  requireClaude();
  await connectDB();
  const pending = await Photo.find({ galerie: galerieId(id), statutAnalyseIA: { $ne: "TERMINEE" } })
    .select("_id")
    .lean<PhotoLean[]>();
  const results = await mapLimit(pending, ANALYSIS_CONCURRENCY, (p) =>
    analysePhoto(p._id.toString()),
  );
  const analysed = results.filter(Boolean).length;
  return { analysed, failed: results.length - analysed };
}

// ── Multi-photo requests (duplicates, story order) ──────────────────────────

async function labelledThumbnails(
  photos: PhotoLean[],
): Promise<{ images: ClaudeImage[]; kept: PhotoLean[] }> {
  const kept: PhotoLean[] = [];
  const images: ClaudeImage[] = [];
  const buffers = await mapLimit(photos, 8, readThumbnail);
  photos.forEach((photo, i) => {
    const data = buffers[i];
    if (!data) return;
    kept.push(photo);
    images.push({ data, mediaType: "image/webp", label: `Photo ${kept.length}` });
  });
  return { images, kept };
}

const duplicatesSchema = z.object({
  groups: z
    .array(
      z.object({
        photos: z.array(z.number()).describe("Photo numbers of near-identical shots (2 or more)."),
        best: z.number().describe("Photo number of the best shot of this group."),
      }),
    )
    .describe("Groups of near-duplicates: same moment, same framing, tiny differences only."),
});

// ── 2. Auto-culling ─────────────────────────────────────────────────────────

export type CullingSummary = {
  kept: number;
  rejected: number;
  duplicates: number;
  analysed: number;
};

/**
 * Keeps or rejects the photos still pending in a gallery: blurry, eyes closed, low score, or a
 * weaker shot of a near-duplicate group → rejected; otherwise kept. Manual choices stay as they are.
 */
export async function autoCullGalerie(id: string): Promise<CullingSummary> {
  requireClaude();
  const galerie = galerieId(id);
  try {
    const { analysed } = await analyseGalerie(id);

    const pending = await Photo.find({ galerie, statutCulling: "EN_ATTENTE" })
      .sort({ createdAt: 1 })
      .limit(BATCH_MAX)
      .select("_id miniature scoreQualite estFloue yeuxFermes statutAnalyseIA")
      .lean<PhotoLean[]>();
    if (!pending.length) return { kept: 0, rejected: 0, duplicates: 0, analysed };

    // Near-duplicates among the pending photos (one request with every thumbnail).
    const duplicateLosers = new Set<string>();
    const groupOf = new Map<string, string>();
    if (pending.length > 1) {
      const { images, kept } = await labelledThumbnails(pending);
      const { groups } = await claudeJson({
        system: ANALYSIS_SYSTEM,
        prompt: `These are ${kept.length} photos from one client gallery, numbered in order.
Find groups of near-duplicates (burst shots of the same moment). Ignore photos that are merely similar in style.`,
        images,
        schema: duplicatesSchema,
        maxTokens: 3000,
      });
      for (const group of groups) {
        const members = [...new Set(group.photos)].filter((n) => n >= 1 && n <= kept.length);
        if (members.length < 2) continue;
        const best = members.includes(group.best) ? group.best : members[0];
        const groupId = new Types.ObjectId().toString();
        for (const n of members) {
          const photoId = kept[n - 1]._id.toString();
          groupOf.set(photoId, groupId);
          if (n !== best) duplicateLosers.add(photoId);
        }
      }
    }

    const fresh = await Photo.find({ _id: { $in: pending.map((p) => p._id) } })
      .select("_id scoreQualite estFloue yeuxFermes statutAnalyseIA")
      .lean<PhotoLean[]>();
    const toKeep: Types.ObjectId[] = [];
    const toReject: Types.ObjectId[] = [];
    for (const photo of fresh) {
      if (photo.statutAnalyseIA !== "TERMINEE") continue; // no analysis: leave it for a human
      const reject =
        photo.estFloue ||
        photo.yeuxFermes ||
        photo.scoreQualite < AI_KEEP_SCORE ||
        duplicateLosers.has(photo._id.toString());
      (reject ? toReject : toKeep).push(photo._id);
    }
    await Promise.all([
      toKeep.length &&
        Photo.updateMany({ _id: { $in: toKeep } }, { $set: { statutCulling: "RETENUE" } }),
      toReject.length &&
        Photo.updateMany({ _id: { $in: toReject } }, { $set: { statutCulling: "REJETEE" } }),
      ...[...groupOf].map(([photoId, groupId]) =>
        Photo.updateOne({ _id: photoId }, { $set: { groupeDoublon: groupId } }),
      ),
    ]);
    return {
      kept: toKeep.length,
      rejected: toReject.length,
      duplicates: duplicateLosers.size,
      analysed,
    };
  } catch (error) {
    toServiceError(error);
  }
}

// ── 3. Story order ──────────────────────────────────────────────────────────

const storySchema = z.object({
  order: z.array(z.number()).describe("Every photo number exactly once, in story order."),
  summary: z.string().describe("One sentence describing the story arc you chose."),
});

/** Orders the gallery's kept / pending photos as a story (rejected photos go last). */
export async function storyOrderGalerie(id: string): Promise<{ ordered: number; summary: string }> {
  requireClaude();
  const galerie = galerieId(id);
  await connectDB();
  try {
    const photos = await Photo.find({ galerie, statutCulling: { $ne: "REJETEE" } })
      .sort({ ordreHistoire: 1, createdAt: 1 })
      .limit(BATCH_MAX)
      .select("_id miniature")
      .lean<PhotoLean[]>();
    if (photos.length < 2) throw new ServiceError("Add at least two kept photos to build a story.");

    const { images, kept } = await labelledThumbnails(photos);
    const result = await claudeJson({
      system: ANALYSIS_SYSTEM,
      prompt: `These ${kept.length} photos form one client gallery. Order them so the gallery tells the
story of the day or the session: establishing shots and preparations first, then the key moments
in chronological order, close-ups and details where they fit the narrative, a strong closing image last.`,
      images,
      schema: storySchema,
      maxTokens: 3000,
      effort: "medium",
    });

    // Keep only valid, unique numbers; anything the model forgot goes at the end in its old order.
    const seen = new Set<number>();
    const order = result.order.filter(
      (n) => n >= 1 && n <= kept.length && !seen.has(n) && seen.add(n),
    );
    kept.forEach((_, i) => !seen.has(i + 1) && order.push(i + 1));

    await Promise.all(
      order.map((n, position) =>
        Photo.updateOne({ _id: kept[n - 1]._id }, { $set: { ordreHistoire: position + 1 } }),
      ),
    );
    await Photo.updateMany(
      { galerie, statutCulling: "REJETEE" },
      { $set: { ordreHistoire: kept.length + 1000 } },
    );
    return { ordered: order.length, summary: result.summary };
  } catch (error) {
    toServiceError(error);
  }
}

// ── 4. Natural-language search ──────────────────────────────────────────────

const searchSchema = z.object({
  matches: z
    .array(
      z.object({
        photo: z.number().describe("Photo number from the catalogue."),
        relevance: z.number().describe("How well it matches the request, 0 to 100."),
      }),
    )
    .describe("Matching photos only, best first."),
  understood: z
    .array(z.string())
    .describe("The 2 to 6 key concepts you understood from the request."),
});

export type PhotoSearchResult = {
  matches: { id: string; relevance: number }[];
  understood: string[];
};

/**
 * Natural-language search: Claude reads a compact catalogue of the analysed photos (description +
 * tags, no images, so it stays cheap) and returns the ones that match the request.
 */
export async function searchPhotos(query: string, limit = 400): Promise<PhotoSearchResult> {
  requireClaude();
  const text = query.trim().slice(0, 300);
  if (!text) return { matches: [], understood: [] };
  await connectDB();
  const photos = await Photo.find({
    statutAnalyseIA: "TERMINEE",
    statutCulling: { $ne: "REJETEE" },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("_id descriptionIA tagsIA")
    .lean<PhotoLean[]>();
  if (!photos.length) {
    throw new ServiceError("No analysed photos yet: run the AI analysis on a gallery first.");
  }
  const catalogue = photos
    .map((p, i) => `${i + 1}. ${p.descriptionIA ?? ""} [${p.tagsIA.join(", ")}]`)
    .join("\n");
  try {
    const result = await claudeJson({
      system:
        "You search a photo studio's library. Match on meaning, not exact words (e.g. 'smiling' matches 'laughing'). Return only photos that genuinely match.",
      prompt: `Request: "${text}"\n\nCatalogue (number. description [tags]):\n${catalogue}`,
      schema: searchSchema,
      maxTokens: 4000,
    });
    const seen = new Set<number>();
    const matches = result.matches
      .filter(
        (m) => m.photo >= 1 && m.photo <= photos.length && !seen.has(m.photo) && seen.add(m.photo),
      )
      .sort((a, b) => b.relevance - a.relevance)
      .map((m) => ({
        id: photos[m.photo - 1]._id.toString(),
        relevance: clamp(m.relevance) / 100,
      }));
    return { matches, understood: result.understood.slice(0, 6) };
  } catch (error) {
    toServiceError(error);
  }
}
