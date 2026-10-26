import "server-only";

import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { findUtilisateurRefs, listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { Avis, type IAvis } from "./avis.model";
import {
  analyzeReview,
  containsProfanity,
  moderateReview,
  type ModerationAnalysis,
  type ReviewAnalysis,
} from "./ai.service";
import type { CreateAvisInput, UpdateOwnAvisInput } from "./avis.schemas";
import type {
  Avis as AvisDTO,
  AvisListResult,
  CategorieModeration,
  Sentiment,
  StatutAvis,
  TopicAvis,
} from "./avis.types";

export const AVIS_PAGE_SIZE = 12;
type AvisLean = IAvis & { _id: Types.ObjectId };

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ServiceError("Review not found.");
  return new Types.ObjectId(id);
}

async function toDTOs(docs: AvisLean[]): Promise<AvisDTO[]> {
  const refs = await findUtilisateurRefs(docs.map((doc) => doc.auteur.toString()));
  return docs.map((doc) => ({
    id: doc._id.toString(),
    note: doc.note,
    commentaire: doc.commentaire,
    dateAvis: doc.createdAt.toISOString(),
    sentimentIA: doc.sentimentIA,
    scoreSentimentIA: doc.scoreSentimentIA ?? 0,
    estPublie: doc.statut === "PUBLIE",
    statut: doc.statut,
    topicsIA: doc.topicsIA,
    statutAnalyseIA: doc.statutAnalyseIA,
    moderation: {
      statut: doc.moderation?.statut ?? "EN_ATTENTE",
      categories: doc.moderation?.categories ?? [],
      explication: doc.moderation?.explication,
      dateAnalyse: doc.moderation?.dateAnalyse?.toISOString(),
    },
    reponseStudio: doc.reponseStudio,
    client: refs.get(doc.auteur.toString()) ?? {
      id: doc.auteur.toString(),
      nom: "Deleted",
      prenom: "user",
    },
    seance: {
      id: doc.seance?.toString() ?? "",
      titre: doc.seanceTitre ?? "Studio session",
      type: doc.seanceType ?? "Session",
    },
  }));
}

export async function createAvis(auteurId: string, input: CreateAvisInput): Promise<AvisDTO> {
  await connectDB();
  if (await containsProfanity(input.commentaire)) {
    throw new ServiceError(
      "Your review contains insulting or inappropriate language. Please edit it before sending.",
      "commentaire",
    );
  }
  const auteur = objectId(auteurId);
  const recentDuplicate = await Avis.exists({
    auteur,
    commentaire: input.commentaire,
    note: input.note,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (recentDuplicate) throw new ServiceError("This review was already submitted recently.");

  const doc = await Avis.create({
    auteur,
    note: input.note,
    commentaire: input.commentaire,
    seance:
      input.seanceId && Types.ObjectId.isValid(input.seanceId)
        ? new Types.ObjectId(input.seanceId)
        : undefined,
    seanceTitre: input.seanceTitre,
    seanceType: input.seanceType,
    statut: "EN_ATTENTE",
    moderation: { statut: "EN_ATTENTE", categories: [] },
    topicsIA: [],
    sentimentIA: "NEUTRE",
    statutAnalyseIA: "EN_ATTENTE",
  });

  await notifyAdmins(
    "Review awaiting moderation",
    "A new customer review is waiting for inspection.",
    `/dashboard/avis`,
  );
  try {
    const [analysisResult, moderationResult] = await Promise.allSettled([
      analyzeReview(doc.commentaire),
      moderateReview(doc.commentaire),
    ]);
    const analysis = analysisResult.status === "fulfilled" ? analysisResult.value : null;
    const moderation = moderationResult.status === "fulfilled" ? moderationResult.value : null;
    await Avis.updateOne(
      { _id: doc._id },
      {
        $set: {
          ...(analysis
            ? {
                sentimentIA: analysis.sentiment,
                scoreSentimentIA: analysis.score,
                topicsIA: analysis.topics,
                statutAnalyseIA: "TERMINEE",
                dateAnalyseIA: new Date(),
                modeleIA: analysis.model,
              }
            : { statutAnalyseIA: "ECHOUEE" }),
          ...(moderation
            ? {
                "moderation.statut": moderation.flagged ? "SIGNALE" : "EN_ATTENTE",
                "moderation.categories": moderation.categories,
                "moderation.explication": moderation.explanation,
                "moderation.dateAnalyse": new Date(),
                "moderation.modeleIA": moderation.model,
              }
            : {}),
        },
      },
    );
  } catch {
    await Avis.updateOne({ _id: doc._id }, { $set: { statutAnalyseIA: "ECHOUEE" } });
  }
  const fresh = await Avis.findById(doc._id).lean<AvisLean>();
  if (!fresh) throw new ServiceError("Review could not be saved.");
  return (await toDTOs([fresh]))[0];
}

/**
 * The author edits their own review. The new text is checked again (profanity), the review
 * goes back to moderation (unpublished until an admin approves it) and is re-analysed by AI.
 */
export async function updateOwnAvis(auteurId: string, input: UpdateOwnAvisInput): Promise<void> {
  await connectDB();
  const review = await Avis.findOne({ _id: objectId(input.id), auteur: objectId(auteurId) })
    .select("_id")
    .lean();
  if (!review) throw new ServiceError("Review not found.");
  if (await containsProfanity(input.commentaire)) {
    throw new ServiceError(
      "Your review contains insulting or inappropriate language. Please edit it before sending.",
      "commentaire",
    );
  }
  await Avis.updateOne(
    { _id: review._id },
    {
      $set: {
        note: input.note,
        commentaire: input.commentaire,
        statut: "EN_ATTENTE",
        moderation: { statut: "EN_ATTENTE", categories: [] },
        statutAnalyseIA: "EN_ATTENTE",
      },
    },
  );
  try {
    await retryAvisAnalysis(review._id.toString());
  } catch {
    await Avis.updateOne({ _id: review._id }, { $set: { statutAnalyseIA: "ECHOUEE" } });
  }
  await notifyAdmins(
    "Review edited",
    "A client edited their review: it is waiting for moderation again.",
    "/dashboard/avis",
  );
}

/** The author deletes their own review (also removed from the public website). */
export async function deleteOwnAvis(auteurId: string, id: string): Promise<void> {
  await connectDB();
  const result = await Avis.deleteOne({ _id: objectId(id), auteur: objectId(auteurId) });
  if (!result.deletedCount) throw new ServiceError("Review not found.");
}

export async function listAvis({
  auteurId,
  publicOnly = false,
  page = 1,
  sentiment,
  topic,
  q,
}: {
  auteurId?: string;
  publicOnly?: boolean;
  page?: number;
  sentiment?: Sentiment;
  topic?: TopicAvis;
  q?: string;
} = {}): Promise<AvisListResult> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (auteurId) filter.auteur = objectId(auteurId);
  if (publicOnly) filter.statut = "PUBLIE";
  if (sentiment) filter.sentimentIA = sentiment;
  if (topic) filter.topicsIA = topic;
  if (q?.trim())
    filter.commentaire = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const total = await Avis.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(total / AVIS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const docs = await Avis.find(filter)
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * AVIS_PAGE_SIZE)
    .limit(AVIS_PAGE_SIZE)
    .lean<AvisLean[]>();
  return { items: await toDTOs(docs), total, page: safePage, pageCount, pageSize: AVIS_PAGE_SIZE };
}

export async function moderateAvis(id: string, statut: StatutAvis, adminId: string): Promise<void> {
  await connectDB();
  const review = await Avis.findById(objectId(id)).lean<IAvis & { _id: Types.ObjectId }>();
  if (!review) throw new ServiceError("Review not found.");
  await Avis.updateOne({ _id: review._id }, { $set: { statut } });
  if (statut === "PUBLIE") {
    await notifyAdmins(
      "Review published",
      "A review is now visible on the public website.",
      "/dashboard/avis",
    );
  }
  void adminId;
}

export async function saveAvisReply(id: string, reponse: string, adminId: string): Promise<void> {
  await connectDB();
  const result = await Avis.updateOne(
    { _id: objectId(id) },
    {
      $set: {
        reponseStudio: reponse.trim(),
        dateReponse: new Date(),
        reponduPar: objectId(adminId),
      },
    },
  );
  if (!result.matchedCount) throw new ServiceError("Review not found.");
}

/** Everything the reply generator needs to personalize a draft (first name, rating, session, topics). */
export async function getAvisReplyContext(id: string): Promise<string> {
  await connectDB();
  const doc = await Avis.findById(objectId(id)).lean<AvisLean>();
  if (!doc) throw new ServiceError("Review not found.");
  const client = (await findUtilisateurRefs([doc.auteur.toString()])).get(doc.auteur.toString());
  return [
    `Client first name: ${client?.prenom ?? "unknown"}`,
    `Rating: ${doc.note}/5`,
    `Session: ${doc.seanceTitre ?? "studio session"}`,
    doc.topicsIA.length ? `Topics detected: ${doc.topicsIA.join(", ")}` : null,
    `Review:\n${doc.commentaire}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function retryAvisAnalysis(id: string): Promise<void> {
  await connectDB();
  const doc = await Avis.findById(objectId(id)).lean<AvisLean>();
  if (!doc) throw new ServiceError("Review not found.");
  const [analysisResult, moderationResult] = await Promise.allSettled([
    analyzeReview(doc.commentaire),
    moderateReview(doc.commentaire),
  ]);
  const analysis = analysisResult.status === "fulfilled" ? analysisResult.value : null;
  const moderation = moderationResult.status === "fulfilled" ? moderationResult.value : null;
  if (!analysis && !moderation) throw new ServiceError("AI analysis could not be completed.");
  await Avis.updateOne(
    { _id: doc._id },
    {
      $set: {
        ...(analysis
          ? {
              sentimentIA: analysis.sentiment,
              scoreSentimentIA: analysis.score,
              topicsIA: analysis.topics,
              statutAnalyseIA: "TERMINEE",
              dateAnalyseIA: new Date(),
              modeleIA: analysis.model,
            }
          : { statutAnalyseIA: "ECHOUEE" }),
        ...(moderation
          ? {
              "moderation.statut": moderation.flagged ? "SIGNALE" : "EN_ATTENTE",
              "moderation.categories": moderation.categories,
              "moderation.explication": moderation.explanation,
              "moderation.dateAnalyse": new Date(),
              "moderation.modeleIA": moderation.model,
            }
          : {}),
      },
    },
  );
}

async function notifyAdmins(titre: string, message: string, lienCible: string): Promise<void> {
  const admins = await listAdminRefs();
  await Promise.all(
    admins
      .filter((admin) => admin.id)
      .map((admin) =>
        createNotification({
          utilisateurId: admin.id,
          titre,
          message,
          type: "RECLAMATION",
          lienCible,
        }),
      ),
  );
}

export function mapReviewAnalysis(
  analysis: ReviewAnalysis,
  moderation: ModerationAnalysis,
): Pick<IAvis, "sentimentIA" | "scoreSentimentIA" | "topicsIA"> & {
  moderation: { categories: CategorieModeration[] };
} {
  return {
    sentimentIA: analysis.sentiment,
    scoreSentimentIA: analysis.score,
    topicsIA: analysis.topics,
    moderation: { categories: moderation.categories },
  };
}
