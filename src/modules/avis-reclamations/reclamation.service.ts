import "server-only";

import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurRefs, listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import { analyzeComplaint, containsProfanity } from "./ai.service";
import { Reclamation, type IReclamation } from "./reclamation.model";
import type { CreateReclamationInput } from "./avis.schemas";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import type {
  CategorieReclamation,
  Priorite,
  Reclamation as ReclamationDTO,
  ReclamationListResult,
  ReclamationMessage,
  StatutReclamation,
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

/** Thread shown under a complaint; a legacy single `reponse` becomes the studio's first bubble. */
function threadOf(
  doc: ReclamationLean,
  refs: Map<string, ReclamationDTO["client"]>,
): ReclamationMessage[] {
  const ref = (id: string) => refs.get(id) ?? { id, ...DELETED_USER };
  const messages = (doc.messages ?? []).map((m) => ({
    id: m._id.toString(),
    auteur: ref(m.auteur.toString()),
    auteurRole: m.auteurRole,
    contenu: m.contenu,
    dateEnvoi: m.createdAt.toISOString(),
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

async function toDTOs(docs: ReclamationLean[]): Promise<ReclamationDTO[]> {
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
    client: refs.get(doc.auteur.toString()) ?? { id: doc.auteur.toString(), ...DELETED_USER },
    seance: { id: doc.seance?.toString() ?? "", titre: doc.seanceTitre ?? "Studio session" },
    traitePar: doc.traitePar ? refs.get(doc.traitePar.toString()) : undefined,
    messages: threadOf(doc, refs),
  }));
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
    "/dashboard/reclamations",
  );
  const fresh = await Reclamation.findById(doc._id).lean<ReclamationLean>();
  if (!fresh) throw new ServiceError("Complaint could not be saved.");
  return (await toDTOs([fresh]))[0];
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
    items: await toDTOs(docs),
    total,
    page: safePage,
    pageCount,
    pageSize: RECLAMATIONS_PAGE_SIZE,
  };
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
    lienCible: "/espace-client/avis",
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
    const recipient = complaint.traitePar?.toString();
    const titre = "New message on a complaint";
    const message = `The client replied about: ${complaint.objet}`;
    if (recipient) {
      await createNotification({
        utilisateurId: recipient,
        titre,
        message,
        type: "RECLAMATION",
        lienCible: "/dashboard/reclamations",
      });
    } else {
      await notifyAdmins(titre, message, "/dashboard/reclamations");
    }
  } else {
    await createNotification({
      utilisateurId: complaint.auteur.toString(),
      titre: "The studio replied to your complaint",
      message: "Open your client area to continue the conversation.",
      type: "RECLAMATION",
      lienCible: "/espace-client/avis",
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
  const doc = await Reclamation.findById(objectId(id)).lean<
    Pick<IReclamation, "auteur" | "objet" | "description" | "seanceTitre">
  >();
  if (!doc) throw new ServiceError("Complaint not found.");
  const client = (await findUtilisateurRefs([doc.auteur.toString()])).get(doc.auteur.toString());
  return [
    `Client first name: ${client?.prenom ?? "unknown"}`,
    `Session: ${doc.seanceTitre ?? "studio session"}`,
    `Subject: ${doc.objet}`,
    `Complaint:\n${doc.description}`,
  ].join("\n");
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
