import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import { Counter } from "./counter.model";
import { Devis, type IDevis } from "./devis.model";
import { getFacturationReferences } from "./facturation.integrations";
import { calculerTotaux, fromMillimes } from "./facturation.utils";
import type { DevisInput } from "./facturation.schema";
import type { Facture, FactureAvecContexte } from "./facturation.types";

export class NotFoundError extends ServiceError {}
export class ForbiddenError extends ServiceError {}
export class ValidationError extends ServiceError {}
export class BusinessRuleError extends ServiceError {}

export type Actor = { id: string; role: Role };

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid identifier.");
  return new Types.ObjectId(id);
}

async function nextNumber(): Promise<string> {
  const year = new Date().getFullYear();
  await connectDB();
  const counter = await Counter.findOneAndUpdate(
    { key: `DEV-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  if (!counter) throw new Error("Could not allocate quote number.");
  return `DEV-${year}-${String(counter.value).padStart(4, "0")}`;
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can manage quotes.");
}

function visibleFilter(actor: Actor) {
  if (actor.role === "ADMIN") return { archivedAt: { $exists: false } };
  if (actor.role === "CLIENT") return { client: objectId(actor.id), statut: { $ne: "BROUILLON" }, archivedAt: { $exists: false } };
  throw new ForbiddenError("You are not allowed to access quotes.");
}

function toView(doc: IDevis & { _id: Types.ObjectId }) {
  return {
    id: doc._id.toString(),
    numero: doc.numero,
    dateEmission: doc.dateEmission.toISOString(),
    dateValidite: doc.dateValidite.toISOString(),
    prestations: doc.lignes.map((line) => ({ designation: line.designation, quantite: line.quantite, prixUnitaire: fromMillimes(line.prixUnitaireHT) })),
    montantHT: fromMillimes(doc.montantHT),
    tva: doc.tva,
    montantTTC: fromMillimes(doc.montantTTC),
    remise: doc.remise,
    statut: doc.statut,
    genereParIA: doc.genereParIA,
    client: { id: doc.client.toString(), prenom: doc.clientSnapshot.nom.split(" ")[0] ?? "", nom: doc.clientSnapshot.nom.split(" ").slice(1).join(" "), photoProfil: undefined },
    seance: { id: doc.seance.toString(), titre: doc.seanceSnapshot.titre },
    factures: doc.factures as Facture[],
  };
}

export async function createDevis(input: DevisInput, actor: Actor) {
  assertAdmin(actor);
  const references = await getFacturationReferences(input.client, input.seance);
  const totals = calculerTotaux(input.lignes, input.remise, input.tva);
  await connectDB();
  const doc = await Devis.create({
    ...input,
    client: objectId(input.client),
    seance: objectId(input.seance),
    createdBy: objectId(actor.id),
    numero: await nextNumber(),
    clientSnapshot: references.client,
    seanceSnapshot: references.seance,
    sousTotal: totals.brut,
    montantHT: totals.montantHT,
    montantTVA: totals.montantTVA,
    montantTTC: totals.montantTTC,
    statut: "BROUILLON",
    historique: [{ action: "CREATE", statutApres: "BROUILLON", par: objectId(actor.id), date: new Date() }],
  });
  return toView(doc.toObject() as IDevis & { _id: Types.ObjectId });
}

export async function listDevis(actor: Actor, filters: { search?: string; statut?: string } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = { ...visibleFilter(actor) };
  if (filters.statut) filter.statut = filters.statut;
  if (filters.search) {
    const search = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ numero: search }, { "clientSnapshot.nom": search }, { "seanceSnapshot.titre": search }];
  }
  const docs = await Devis.find(filter).sort({ dateEmission: -1 }).lean<(IDevis & { _id: Types.ObjectId })[]>();
  return docs.map(toView);
}

export async function getDevis(id: string, actor: Actor) {
  await connectDB();
  const filter: Record<string, unknown> = { _id: objectId(id), ...visibleFilter(actor) };
  const doc = await Devis.findOne(filter).lean<IDevis & { _id: Types.ObjectId }>();
  if (!doc) throw new NotFoundError("Quote not found.");
  return toView(doc);
}

export async function updateDevis(id: string, input: DevisInput, actor: Actor) {
  assertAdmin(actor);
  await connectDB();
  const existing = await Devis.findById(objectId(id));
  if (!existing) throw new NotFoundError("Quote not found.");
  if (existing.statut !== "BROUILLON") throw new BusinessRuleError("Only draft quotes can be edited.");
  const references = await getFacturationReferences(input.client, input.seance);
  const totals = calculerTotaux(input.lignes, input.remise, input.tva);
  Object.assign(existing, {
    ...input,
    client: objectId(input.client), seance: objectId(input.seance),
    clientSnapshot: references.client, seanceSnapshot: references.seance,
    sousTotal: totals.brut, montantHT: totals.montantHT, montantTVA: totals.montantTVA, montantTTC: totals.montantTTC,
  });
  existing.historique.push({ action: "UPDATE", statutAvant: "BROUILLON", statutApres: "BROUILLON", par: objectId(actor.id), date: new Date() });
  await existing.save();
  return toView(existing.toObject() as IDevis & { _id: Types.ObjectId });
}

export async function deleteDevis(id: string, actor: Actor) {
  assertAdmin(actor);
  await connectDB();
  const doc = await Devis.findById(objectId(id));
  if (!doc) throw new NotFoundError("Quote not found.");
  if (doc.statut === "BROUILLON" && doc.factures.length === 0) await doc.deleteOne();
  else { doc.archivedAt = new Date(); await doc.save(); }
}

export async function duplicateDevis(id: string, actor: Actor) {
  assertAdmin(actor);
  const original = await getDevis(id, { ...actor, role: "ADMIN" });
  const now = new Date();
  return createDevis({
    client: original.client.id,
    seance: original.seance.id,
    lignes: original.prestations.map((line) => ({ designation: line.designation, quantite: line.quantite, prixUnitaireHT: Math.round(line.prixUnitaire * 1000) })),
    remise: original.remise,
    tva: original.tva,
    devise: "TND",
    tauxAcompte: 30,
    dateEmission: now,
    dateValidite: new Date(now.getTime() + 30 * 86400000),
  }, actor);
}

export async function getDevisStats(actor: Actor) {
  const docs = await listDevis(actor);
  return {
    brouillons: docs.filter((d) => d.statut === "BROUILLON").length,
    envoyes: docs.filter((d) => d.statut === "ENVOYE").length,
    acceptes: docs.filter((d) => d.statut === "ACCEPTE").length,
    montantAccepte: docs.filter((d) => d.statut === "ACCEPTE").reduce((sum, d) => sum + Math.round(d.montantTTC * 1000), 0),
  };
}

export async function listFactures(actor: Actor): Promise<FactureAvecContexte[]> {
  await connectDB();
  const filter: Record<string, unknown> = visibleFilter(actor);
  const docs = await Devis.find(filter).sort({ dateEmission: -1 }).lean<(IDevis & { _id: Types.ObjectId })[]>();
  return docs.flatMap((doc) => (doc.factures as Array<Record<string, unknown>>).map((facture) => ({
    id: String(facture._id ?? `${doc._id}-${facture.numero}`),
    numero: String(facture.numero),
    type: facture.type as Facture["type"],
    dateEmission: new Date(String(facture.dateEmission)).toISOString(),
    dateEcheance: new Date(String(facture.dateEcheance)).toISOString(),
    montantTTC: fromMillimes(Number(facture.montantTTC)),
    montantPaye: fromMillimes(Number(facture.montantPaye)),
    statut: facture.statut as Facture["statut"],
    devis: {
      id: doc._id.toString(),
      numero: doc.numero,
      client: { id: doc.client.toString(), prenom: doc.clientSnapshot.nom.split(" ")[0] ?? "", nom: doc.clientSnapshot.nom.split(" ").slice(1).join(" ") },
      seance: { id: doc.seance.toString(), titre: doc.seanceSnapshot.titre },
    },
  })));
}
