import "server-only";

import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db";
import { Avis } from "./avis.model";
import { AIConfigurationError, generateReviewSummary } from "./ai.service";
import { AvisSummary } from "./summary.model";

export async function getPublicReviewSummary(scope = "public"): Promise<{
  summary: string;
  strengths: string[];
  improvements: string[];
  generatedAt: string;
} | null> {
  await connectDB();
  const reviews = await Avis.find({ statut: "PUBLIE" })
    .select("note commentaire topicsIA createdAt")
    .sort({ createdAt: -1 })
    .lean<Array<{ note: number; commentaire: string; topicsIA: string[]; createdAt: Date }>>();
  if (!reviews.length) return null;
  const sourceVersion = createHash("sha256")
    .update(
      reviews.map((review) => `${review.createdAt.toISOString()}:${review.commentaire}`).join("|"),
    )
    .digest("hex");
  const existing = await AvisSummary.findOne({ scope, sourceVersion }).lean();
  if (existing) {
    return {
      summary: existing.summary,
      strengths: existing.strengths,
      improvements: existing.improvements,
      generatedAt: existing.generatedAt.toISOString(),
    };
  }
  try {
    const generated = await generateReviewSummary(
      reviews.map((review) => ({
        rating: review.note,
        comment: review.commentaire,
        topics: review.topicsIA ?? [],
      })),
    );
    await AvisSummary.findOneAndUpdate(
      { scope },
      {
        $set: {
          ...generated,
          sourceCount: reviews.length,
          generatedAt: new Date(),
          sourceVersion,
          model: generated.model,
        },
      },
      { upsert: true },
    );
    return {
      summary: generated.summary,
      strengths: generated.strengths,
      improvements: generated.improvements,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Optional homepage section: an AI outage hides it instead of crashing the page.
    if (!(error instanceof AIConfigurationError)) {
      console.warn(`Review summary skipped: ${error instanceof Error ? error.message : error}`);
    }
    return null;
  }
}
