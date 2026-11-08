import "server-only";

import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurRefs, listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import {
  analyzeClientMessage,
  analyzeComplaint,
  containsProfanity,
  summarizeComplaintThread,
} from "./ai.service";
import { Reclamation, type IReclamation } from "./reclamation.model";
import type { CreateReclamationInput, UpdateOwnReclamationInput } from "./avis.schemas";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import {
  PRIORITES,
  REOPEN_DAYS,
  type CategorieReclamation,
  type Priorite,
  type Reclamation as ReclamationDTO,
  type ReclamationListResult,
  type ReclamationMessage,
  type ResumeReclamation,
  reclamationHref,
  type StatutReclamation,
} from "./avis.types";

export const RECLAMATIONS_PAGE_SIZE = 12;
type ReclamationLean = IReclamation & { _id: Types.ObjectId };

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ServiceError("Complaint not found.");
  return new Types.ObjectId(id);
}

const DELETED_USER = { nom: "Deleted", prenom: "user" };

function isClosed(statut: StatutReclamation): boolean {
  return statut === "RESOLUE" || statut === "REJETEE";
}

/** Staff see the AI signals (sentiment, escalation, digest); the client never does. */
type View = { staff: boolean };

/** Thread shown under a complaint; a legacy single `reponse` becomes the studio's first bubble. */
function threadOf(
  doc: ReclamationLean,
  refs: Map<string, ReclamationDTO["client"]>,
  { staff }: View,
): ReclamationMessage[] {
  const ref = (id: string) => refs.get(id) ?? { id, ...DELETED_USER };
  const messages: ReclamationMessage[] = (doc.messages ?? [])
    .filter((m) => staff || m.evenement !== "ESCALADE")
    .map((m) => ({
      id: m._id.toString(),
      auteur: ref(m.auteur.toString()),
      auteurRole: m.auteurRole,
      contenu: m.contenu,
      dateEnvoi: m.createdAt.toISOString(),
      evenement: m.evenement,
      sentimentIA: staff ? m.sentimentIA : undefined,
    }));
  if (!messages.length && doc.reponse && doc.traitePar) {
    messages.push({
      id: `${doc._id.toString()}-reponse`,
      auteur: ref(doc.traitePar.toString()),
      auteurRole: "ADMIN",
      contenu: doc.reponse,
      dateEnvoi: (doc.dateReponse ?? doc.updatedAt).toISOString(),
    });
  }
  return messages;
}

async function toDTOs(
  docs: ReclamationLean[],
  view: View = { staff: true },
): Promise<ReclamationDTO[]> {
  const ids = docs
    .flatMap((doc) => [
      doc.auteur.toString(),
      doc.traitePar?.toString(),
      ...(doc.messages ?? []).map((m) => m.auteur.toString()),
    ])
    .filter(Boolean) as string[];
  const refs = await findUtilisateurRefs(ids);
  return docs.map((doc) => ({
    id: doc._id.toString(),
    objet: doc.objet,
    description: doc.description,
    categorie: doc.categorie,
    categorieIA: doc.categorieIA,
    priorite: doc.priorite,
    statut: doc.statut,
    reponse: doc.reponse,
    dateCreation: doc.createdAt.toISOString(),
    dateResolution: doc.dateResolution?.toISOString(),
    derniereActivite: doc.updatedAt.toISOString(),
    client: refs.get(doc.auteur.toString()) ?? { id: doc.auteur.toString(), ...DELETED_USER },
    seance: { id: doc.seance?.toString() ?? "", titre: doc.seanceTitre ?? "Studio session" },
    traitePar: doc.traitePar ? refs.get(doc.traitePar.toString()) : undefined,
    messages: threadOf(doc, refs, view),
    satisfaction: doc.satisfaction && {
      satisfait: doc.satisfaction.satisfait,
      date: doc.satisfaction.date.toISOString(),
    },
    nombreReouvertures: doc.nombreReouvertures ?? 0,
    peutRouvrir: doc.statut === "RESOLUE" && canReopen(doc.dateResolution),
    escaladeIA: view.staff ? doc.escaladeIA?.toISOString() : undefined,
    resumeIA: view.staff && doc.resumeIA ? resumeDTO(doc.resumeIA) : undefined,
  }));
}

function resumeDTO(resume: NonNullable<IReclamation["resumeIA"]>): ResumeReclamation {
  return {
    demande: resume.demande,
    engagements: resume.engagements,
    enSuspens: resume.enSuspens,
    dateGeneration: resume.dateGeneration.toISOString(),
    nbMessages: resume.nbMessages,
  };
}

/** Plain-text conversation (description first) handed to the AI; events are skipped. */
async function transcriptOf(doc: ReclamationLean, lastMessages = 20): Promise<string> {
  const messages = (doc.messages ?? []).filter((m) => !m.evenement).slice(-lastMessages);
  const refs = await findUtilisateurRefs([
    doc.auteur.toString(),
    ...messages.map((m) => m.auteur.toString()),
  ]);
  const who = (id: string, role: Role) =>
    `${role === "CLIENT" ? "Client" : "Studio"} (${refs.get(id)?.prenom ?? "unknown"})`;
  return [
    `${who(doc.auteur.toString(), "CLIENT")}: ${doc.description}`,
    ...messages.map(
      (m) => `${who(m.auteur.toString(), m.auteurRole)}: ${m.contenu.slice(0, 1000)}`,
    ),
  ].join("\n\n");
}

export async function createReclamation(
  auteurId: string,
  input: CreateReclamationInput,
): Promise<ReclamationDTO> {
  await connectDB();
  const [subjectProfane, descriptionProfane] = await Promise.all([
    containsProfanity(input.objet),
    containsProfanity(input.description),
  ]);
  if (subjectProfane) {
    throw new ServiceError(
      "The complaint subject contains insulting or inappropriate language. Please edit it before sending.",
      "objet",
    );
  }
  if (descriptionProfane) {
    throw new ServiceError(
      "The complaint description contains insulting or inappropriate language. Please edit it before sending.",
      "description",
    );
  }
  const doc = await Reclamation.create({
    auteur: objectId(auteurId),
    objet: input.objet,
    description: input.description,
    categorie: input.categorie,
    categorieIA: input.categorie,
    priorite: "MOYENNE",
    statut: "OUVERTE",
    seance:
      input.seanceId && Types.ObjectId.isValid(input.seanceId)
        ? new Types.ObjectId(input.seanceId)
        : undefined,
    seanceTitre: input.seanceTitre,
  });

  try {
    const analysis = await analyzeComplaint(doc.objet, doc.description);
    await Reclamation.updateOne(
      { _id: doc._id },
      { $set: { categorieIA: analysis.category, priorite: analysis.priority } },
    );
  } catch {
    // The complaint remains usable when the optional AI provider is unavailable.
  }

  await notifyAdmins(
    "New complaint received",
    `A new complaint requires attention: ${doc.objet}`,
    reclamationHref(doc._id.toString(), "staff"),
  );
  const fresh = await Reclamation.findById(doc._id).lean<ReclamationLean>();
  if (!fresh) throw new ServiceError("Complaint could not be saved.");
  return (await toDTOs([fresh]))[0];
}

/**
 * The author edits their own complaint, only while it is still open: once the studio is
 * handling it (or has answered), the content is frozen so it matches the studio's reply.
 */
export async function updateOwnReclamation(
  auteurId: string,
  input: UpdateOwnReclamationInput,
): Promise<void> {
  await connectDB();
  const complaint = await Reclamation.findOne({
    _id: objectId(input.id),
    auteur: objectId(auteurId),
  }).lean<ReclamationLean>();
  if (!complaint) throw new ServiceError("Complaint not found.");
  if (complaint.statut !== "OUVERTE") {
    throw new ServiceError(
      "The studio is already handling this complaint: it can no longer be edited.",
    );
  }
  const [subjectProfane, descriptionProfane] = await Promise.all([
    containsProfanity(input.objet),
    containsProfanity(input.description),
  ]);
  if (subjectProfane) {
    throw new ServiceError(
      "The complaint subject contains insulting or inappropriate language. Please edit it before sending.",
      "objet",
    );
  }
  if (descriptionProfane) {
    throw new ServiceError(
      "The complaint description contains insulting or inappropriate language. Please edit it before sending.",
      "description",
    );
  }
  const update: Record<string, unknown> = {
    objet: input.objet,
    description: input.description,
    categorie: input.categorie,
    categorieIA: input.categorie,
  };
  try {
    const analysis = await analyzeComplaint(input.objet, input.description);
    update.categorieIA = analysis.category;
    update.priorite = analysis.priority;
  } catch {
    // Keeps the previous AI priority when the optional AI provider is unavailable.
  }
  await Reclamation.updateOne({ _id: complaint._id, statut: "OUVERTE" }, { $set: update });
  await notifyAdmins(
    "Complaint edited",
    `A client edited their complaint: ${input.objet}`,
    "/dashboard/reclamations",
  );
}

/** The author deletes their own complaint (whatever its status). */
export async function deleteOwnReclamation(auteurId: string, id: string): Promise<void> {
  await connectDB();
  const result = await Reclamation.deleteOne({ _id: objectId(id), auteur: objectId(auteurId) });
  if (!result.deletedCount) throw new ServiceError("Complaint not found.");
}

export async function listReclamations({
  auteurId,
  page = 1,
  statut,
  priorite,
}: {
  auteurId?: string;
  page?: number;
  statut?: StatutReclamation;
  priorite?: Priorite;
} = {}): Promise<ReclamationListResult> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (auteurId) filter.auteur = objectId(auteurId);
  if (statut) filter.statut = statut;
  if (priorite) filter.priorite = priorite;
  const total = await Reclamation.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(total / RECLAMATIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const docs = await Reclamation.find(filter)
    .sort({ priorite: 1, createdAt: -1 })
    .skip((safePage - 1) * RECLAMATIONS_PAGE_SIZE)
    .limit(RECLAMATIONS_PAGE_SIZE)
    .lean<ReclamationLean[]>();
  return {
    // A client listing their own complaints gets the client view.
    items: await toDTOs(docs, { staff: !auteurId }),
    total,
    page: safePage,
    pageCount,
    pageSize: RECLAMATIONS_PAGE_SIZE,
  };
}

const INBOX_LIMIT = 100;

/** Conversations of the inbox, most recent activity first (a client only sees their own). */
export async function listReclamationThreads(auteurId?: string): Promise<ReclamationDTO[]> {
  await connectDB();
  const docs = await Reclamation.find(auteurId ? { auteur: objectId(auteurId) } : {})
    .sort({ updatedAt: -1 })
    .limit(INBOX_LIMIT)
    .lean<ReclamationLean[]>();
  return toDTOs(docs, { staff: !auteurId });
}

/** One complaint for its conversation page; null when missing or not the client's own. */
export async function getReclamationForViewer(
  id: string,
  viewer: { id: string; role: Role },
): Promise<ReclamationDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const isClient = viewer.role === "CLIENT";
  const doc = await Reclamation.findOne({
    _id: new Types.ObjectId(id),
    ...(isClient ? { auteur: objectId(viewer.id) } : {}),
  }).lean<ReclamationLean>();
  return doc ? (await toDTOs([doc], { staff: !isClient }))[0] : null;
}

export async function updateReclamation(
  id: string,
  statut: StatutReclamation,
  reponse: string | undefined,
  adminId: string,
): Promise<void> {
  await connectDB();
  const complaint = await Reclamation.findById(objectId(id)).lean<ReclamationLean>();
  if (!complaint) throw new ServiceError("Complaint not found.");
  const now = new Date();
  const update: Record<string, unknown> = {
    statut,
    traitePar: objectId(adminId),
    ...(reponse?.trim() ? { reponse: reponse.trim(), dateReponse: now } : {}),
    ...(isClosed(statut) ? { dateResolution: now } : {}),
  };
  await Reclamation.updateOne(
    { _id: complaint._id },
    {
      $set: update,
      ...(reponse?.trim()
        ? {
            $push: {
              messages: {
                auteur: objectId(adminId),
                auteurRole: "ADMIN",
                contenu: reponse.trim(),
                createdAt: now,
              },
            },
          }
        : {}),
    },
  );
  await createNotification({
    utilisateurId: complaint.auteur.toString(),
    titre: reponse?.trim() ? "The studio replied to your complaint" : "Complaint status updated",
    message: reponse?.trim()
      ? "Open your client area to read the studio's response."
      : `Your complaint is now marked "${statut}".`,
    type: "RECLAMATION",
    lienCible: reclamationHref(complaint._id.toString(), "client"),
  });
}

/**
 * Adds a bubble to the complaint conversation. The client may only write on their own
 * complaint; staff (admin / photographer) may write on any. Closed complaints are read-only.
 */
export async function addReclamationMessage(
  id: string,
  sender: { id: string; role: Role },
  contenu: string,
): Promise<ReclamationMessage> {
  await connectDB();
  const complaint = await Reclamation.findById(objectId(id)).lean<ReclamationLean>();
  if (!complaint) throw new ServiceError("Complaint not found.");
  const isClient = sender.role === "CLIENT";
  if (isClient && complaint.auteur.toString() !== sender.id) {
    throw new ServiceError("Complaint not found.");
  }
  if (isClosed(complaint.statut)) {
    throw new ServiceError("This complaint is closed; the conversation is read-only.");
  }
  if (await containsProfanity(contenu)) {
    throw new ServiceError(
      "Your message contains insulting or inappropriate language. Please edit it before sending.",
      "contenu",
    );
  }

  const now = new Date();
  const messageId = new Types.ObjectId();
  await Reclamation.updateOne(
    { _id: complaint._id },
    {
      $push: {
        messages: {
          _id: messageId,
          auteur: objectId(sender.id),
          auteurRole: sender.role,
          contenu,
          createdAt: now,
        },
      },
      // Staff answering an open complaint takes it in charge.
      ...(!isClient
        ? {
            $set: {
              traitePar: objectId(sender.id),
              reponse: contenu,
              dateReponse: now,
              ...(complaint.statut === "OUVERTE" ? { statut: "EN_COURS" } : {}),
            },
          }
        : {}),
    },
  );

  if (isClient) {
    await notifyHandler(
      complaint,
      "New message on a complaint",
      `The client replied about: ${complaint.objet}`,
    );
  } else {
    await createNotification({
      utilisateurId: complaint.auteur.toString(),
      titre: "The studio replied to your complaint",
      message: "Open the conversation to read and answer it.",
      type: "RECLAMATION",
      lienCible: reclamationHref(complaint._id.toString(), "client"),
    });
  }

  const author = (await findUtilisateurRefs([sender.id])).get(sender.id);
  return {
    id: messageId.toString(),
    auteur: author ?? { id: sender.id, ...DELETED_USER },
    auteurRole: sender.role,
    contenu,
    dateEnvoi: now.toISOString(),
  };
}

export async function getReclamationReplyContext(id: string): Promise<string> {
  await connectDB();
  const doc = await Reclamation.findById(objectId(id)).lean<ReclamationLean>();
  if (!doc) throw new ServiceError("Complaint not found.");
  const client = (await findUtilisateurRefs([doc.auteur.toString()])).get(doc.auteur.toString());
  const hasThread = (doc.messages ?? []).some((m) => !m.evenement);
  return [
    `Client first name: ${client?.prenom ?? "unknown"}`,
    `Session: ${doc.seanceTitre ?? "studio session"}`,
    `Subject: ${doc.objet}`,
    hasThread
      ? `Conversation so far (oldest first):\n${await transcriptOf(doc)}`
      : `Complaint:\n${doc.description}`,
  ].join("\n");
}

/** AI digest of the thread, cached until a new message arrives. */
export async function summarizeReclamation(id: string): Promise<ResumeReclamation> {
  await connectDB();
  const doc = await Reclamation.findById(objectId(id)).lean<ReclamationLean>();
  if (!doc) throw new ServiceError("Complaint not found.");
  const nbMessages = (doc.messages ?? []).length;
  if (doc.resumeIA && doc.resumeIA.nbMessages === nbMessages) return resumeDTO(doc.resumeIA);
  const summary = await summarizeComplaintThread(
    `Subject: ${doc.objet}\nStatus: ${doc.statut}\n\n${await transcriptOf(doc)}`,
  );
  const resumeIA = {
    demande: summary.asked,
    engagements: summary.promised,
    enSuspens: summary.open,
    dateGeneration: new Date(),
    nbMessages,
  };
  await Reclamation.updateOne({ _id: doc._id }, { $set: { resumeIA } });
  return resumeDTO(resumeIA);
}

const ESCALATION_THRESHOLD = 0.8;
const RISING_STEP = 0.15;

/**
 * Runs after a client message is saved (via `after()`): stores its AI sentiment and, when the
 * client is clearly upset or getting angrier, raises the priority one step and alerts the staff.
 * Best-effort — any AI failure leaves the thread untouched.
 */
export async function analyzeClientMessageInThread(id: string, messageId: string): Promise<void> {
  await connectDB();
  const doc = await Reclamation.findById(objectId(id)).lean<ReclamationLean>();
  const index = doc?.messages.findIndex((m) => m._id.toString() === messageId) ?? -1;
  if (!doc || index < 0) return;
  const message = doc.messages[index];
  const earlier = { ...doc, messages: doc.messages.slice(0, index) };

  let analysis;
  try {
    analysis = await analyzeClientMessage(message.contenu, await transcriptOf(earlier, 10));
  } catch {
    return;
  }

  const previous = earlier.messages
    .filter((m) => m.auteurRole === "CLIENT" && m.scoreFrustrationIA !== undefined)
    .at(-1);
  const rising =
    previous?.scoreFrustrationIA !== undefined &&
    analysis.frustration >= previous.scoreFrustrationIA + RISING_STEP;
  const escalate =
    analysis.sentiment === "NEGATIF" &&
    (analysis.frustration >= ESCALATION_THRESHOLD || (rising && analysis.frustration >= 0.5));
  const nextPriority =
    PRIORITES[Math.min(PRIORITES.indexOf(doc.priorite) + 1, PRIORITES.length - 1)];
  // Already urgent and already flagged: nothing new to tell the staff.
  const shouldEscalate = escalate && !(nextPriority === doc.priorite && doc.escaladeIA);

  await Reclamation.updateOne(
    { _id: doc._id, "messages._id": message._id },
    {
      $set: {
        "messages.$.sentimentIA": analysis.sentiment,
        "messages.$.scoreFrustrationIA": analysis.frustration,
        ...(shouldEscalate ? { priorite: nextPriority, escaladeIA: new Date() } : {}),
      },
    },
  );
  if (!shouldEscalate) return;

  await Reclamation.updateOne(
    { _id: doc._id },
    {
      $push: {
        messages: {
          auteur: doc.auteur,
          auteurRole: "CLIENT",
          evenement: "ESCALADE",
          contenu:
            nextPriority === doc.priorite
              ? "AI: the client is getting more frustrated."
              : `AI: the client is getting more frustrated — priority raised to ${nextPriority}.`,
          createdAt: new Date(),
        },
      },
    },
  );
  await notifyHandler(
    doc,
    "Client frustration rising",
    `The AI flagged growing frustration on: ${doc.objet}`,
  );
}

function assertOwnResolved(doc: ReclamationLean | null, clientId: string): ReclamationLean {
  if (!doc || doc.auteur.toString() !== clientId) throw new ServiceError("Complaint not found.");
  if (doc.statut !== "RESOLUE") throw new ServiceError("This complaint is not resolved.");
  return doc;
}

/** The client says whether the resolution suited them (once per resolution). */
export async function rateReclamationResolution(
  clientId: string,
  id: string,
  satisfait: boolean,
): Promise<void> {
  await connectDB();
  const doc = assertOwnResolved(
    await Reclamation.findById(objectId(id)).lean<ReclamationLean>(),
    clientId,
  );
  if (doc.satisfaction) throw new ServiceError("You already rated this resolution.");
  const now = new Date();
  await Reclamation.updateOne(
    { _id: doc._id, satisfaction: { $exists: false } },
    {
      $set: { satisfaction: { satisfait, date: now } },
      $push: {
        messages: {
          auteur: doc.auteur,
          auteurRole: "CLIENT",
          evenement: satisfait ? "SATISFAIT" : "INSATISFAIT",
          contenu: satisfait
            ? "The client is satisfied with the resolution."
            : "The client is not satisfied with the resolution.",
          createdAt: now,
        },
      },
    },
  );
  if (!satisfait) {
    await notifyHandler(
      doc,
      "Resolution not satisfying",
      `The client is not satisfied with how this was resolved: ${doc.objet}`,
    );
  }
}

function canReopen(dateResolution: Date | string | undefined, now = new Date()): boolean {
  if (!dateResolution) return false;
  return now.getTime() - new Date(dateResolution).getTime() <= REOPEN_DAYS * 86_400_000;
}

/** The client reopens a resolved complaint within REOPEN_DAYS; it goes back to "in progress". */
export async function reopenReclamation(
  clientId: string,
  id: string,
  raison: string | undefined,
): Promise<void> {
  await connectDB();
  const doc = assertOwnResolved(
    await Reclamation.findById(objectId(id)).lean<ReclamationLean>(),
    clientId,
  );
  if (!canReopen(doc.dateResolution)) {
    throw new ServiceError(
      `A complaint can only be reopened within ${REOPEN_DAYS} days of its resolution.`,
    );
  }
  const reason = raison?.trim();
  if (reason && (await containsProfanity(reason))) {
    throw new ServiceError(
      "Your message contains insulting or inappropriate language. Please edit it before sending.",
      "raison",
    );
  }
  const now = new Date();
  await Reclamation.updateOne(
    { _id: doc._id, statut: "RESOLUE" },
    {
      $set: { statut: "EN_COURS" },
      $unset: { dateResolution: "", satisfaction: "" },
      $inc: { nombreReouvertures: 1 },
      $push: {
        messages: {
          $each: [
            {
              auteur: doc.auteur,
              auteurRole: "CLIENT",
              evenement: "REOUVERTURE",
              contenu: "The client reopened the complaint.",
              createdAt: now,
            },
            ...(reason
              ? [{ auteur: doc.auteur, auteurRole: "CLIENT", contenu: reason, createdAt: now }]
              : []),
          ],
        },
      },
    },
  );
  await notifyHandler(doc, "Complaint reopened", `The client reopened: ${doc.objet}`);
}

/** Notifies whoever handles the complaint, or every admin while nobody has taken it. */
async function notifyHandler(doc: ReclamationLean, titre: string, message: string): Promise<void> {
  const handler = doc.traitePar?.toString();
  const lienCible = reclamationHref(doc._id.toString(), "staff");
  if (!handler) return notifyAdmins(titre, message, lienCible);
  await createNotification({
    utilisateurId: handler,
    titre,
    message,
    type: "RECLAMATION",
    lienCible,
  });
}

async function notifyAdmins(titre: string, message: string, lienCible: string): Promise<void> {
  const admins = await listAdminRefs();
  await Promise.all(
    admins.map((admin) =>
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

export function complaintCategoryLabel(category: CategorieReclamation): string {
  return category;
}
