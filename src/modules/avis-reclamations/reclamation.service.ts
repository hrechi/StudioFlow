import "server-only";

import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurRefs, listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import { analyzeComplaint, containsProfanity } from "./ai.service";
import { Reclamation, type IReclamation } from "./reclamation.model";
import type { CreateReclamationInput } from "./avis.schemas";
import type {
  CategorieReclamation,
  Priorite,
  Reclamation as ReclamationDTO,
  ReclamationListResult,
  StatutReclamation,
} from "./avis.types";

export const RECLAMATIONS_PAGE_SIZE = 12;
type ReclamationLean = IReclamation & { _id: Types.ObjectId };

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ServiceError("Complaint not found.");
  return new Types.ObjectId(id);
}

async function toDTOs(docs: ReclamationLean[]): Promise<ReclamationDTO[]> {
  const ids = docs
    .flatMap((doc) => [doc.auteur.toString(), doc.traitePar?.toString()])
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
    client: refs.get(doc.auteur.toString()) ?? {
      id: doc.auteur.toString(),
      nom: "Deleted",
      prenom: "user",
    },
    seance: { id: doc.seance?.toString() ?? "", titre: doc.seanceTitre ?? "Studio session" },
    traitePar: doc.traitePar ? refs.get(doc.traitePar.toString()) : undefined,
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
    ...(statut === "RESOLUE" || statut === "REJETEE" ? { dateResolution: now } : {}),
  };
  await Reclamation.updateOne({ _id: complaint._id }, { $set: update });
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
