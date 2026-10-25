import "server-only";

import { connectDB } from "@/lib/db";
import { Avis } from "./avis.model";
import type { AnalyticsQuery } from "./avis.schemas";
import type { AvisInsights, Sentiment, TopicAvis } from "./avis.types";

const TIMEZONE = "Africa/Tunis";

export type AvisAnalytics = {
  total: number;
  averageRating: number;
  sentiments: Record<"POSITIF" | "NEUTRE" | "NEGATIF", number>;
  topics: Array<{ topic: string; count: number }>;
  trend: Array<{ date: string; count: number; averageRating: number }>;
};

export async function getAvisAnalytics(query: AnalyticsQuery = {}): Promise<AvisAnalytics> {
  await connectDB();
  const match: Record<string, unknown> = { statut: "PUBLIE" };
  if (query.sentiment) match.sentimentIA = query.sentiment;
  if (query.topic) match.topicsIA = query.topic;
  if (query.q) match.commentaire = { $regex: query.q, $options: "i" };
  if (query.from || query.to) {
    match.createdAt = {
      ...(query.from ? { $gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const [overview, sentimentRows, topics, trend] = await Promise.all([
    Avis.aggregate<{ _id: null; total: number; averageRating: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: 1 }, averageRating: { $avg: "$note" } } },
    ]),
    Avis.aggregate<{ _id: "POSITIF" | "NEUTRE" | "NEGATIF"; count: number }>([
      { $match: match },
      { $group: { _id: "$sentimentIA", count: { $sum: 1 } } },
    ]),
    Avis.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $unwind: "$topicsIA" },
      { $group: { _id: "$topicsIA", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Avis.aggregate<{ _id: string; count: number; averageRating: number }>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          averageRating: { $avg: "$note" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    total: overview[0]?.total ?? 0,
    averageRating: overview[0]?.averageRating ?? 0,
    sentiments: {
      POSITIF: sentimentRows.find((row) => row._id === "POSITIF")?.count ?? 0,
      NEUTRE: sentimentRows.find((row) => row._id === "NEUTRE")?.count ?? 0,
      NEGATIF: sentimentRows.find((row) => row._id === "NEGATIF")?.count ?? 0,
    },
    topics: topics.map((row) => ({ topic: row._id, count: row.count })),
    trend: trend.map((row) => ({
      date: row._id,
      count: row.count,
      averageRating: row.averageRating,
    })),
  };
}

export const INSIGHT_MONTHS = 6;

/**
 * Dashboard insights: AI-analyzed reviews (published or not) of the last months,
 * counted per month × sentiment, overall (topic null) and per topic.
 */
export async function getAvisInsights(): Promise<AvisInsights> {
  await connectDB();
  const [year, current] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  const months = Array.from({ length: INSIGHT_MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(year, current - INSIGHT_MONTHS + i, 1));
    return d.toISOString().slice(0, 7);
  });
  // A day of margin for the timezone offset; rows outside `months` are ignored by the UI.
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);
  since.setUTCDate(since.getUTCDate() - 1);
  const match = { statutAnalyseIA: "TERMINEE", createdAt: { $gte: since } };
  const month = { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TIMEZONE } };

  const [totals, perTopic] = await Promise.all([
    Avis.aggregate<{ _id: { month: string; sentiment: Sentiment }; count: number }>([
      { $match: match },
      { $group: { _id: { month, sentiment: "$sentimentIA" }, count: { $sum: 1 } } },
    ]),
    Avis.aggregate<{
      _id: { month: string; topic: TopicAvis; sentiment: Sentiment };
      count: number;
    }>([
      { $match: match },
      { $unwind: "$topicsIA" },
      {
        $group: {
          _id: { month, topic: "$topicsIA", sentiment: "$sentimentIA" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    months,
    rows: [
      ...totals.map((row) => ({ ...row._id, topic: null, count: row.count })),
      ...perTopic.map((row) => ({ ...row._id, count: row.count })),
    ],
  };
}
