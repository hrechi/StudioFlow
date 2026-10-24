import "server-only";
import { Types, type HydratedDocument } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import { Counter } from "./counter.model";
import { Devis, type IDevis, type IFacture } from "./devis.model";
import { getFacturationReferences, getFacturationSession } from "./facturation.integrations";
import { calculerTotaux, fromMillimes, toMillimes } from "./facturation.utils";
import type { DevisInput, PaiementInput, ReponseDevis } from "./facturation.schema";
import {
  modePaiementLabels,
  planPaiementLabels,
  TAUX_ACOMPTE_PAR_DEFAUT,
  VALIDITE_DEVIS_JOURS,
  type Devis as DevisView,
  type Facture,
  type FactureAvecContexte,
  type LignePrestation,
  type PlanPaiement,
  type StatutDevis,
  type StatutFacture,
  type TypeFacture,
} from "./facturation.types";

export class NotFoundError extends ServiceError {}
export class ForbiddenError extends ServiceError {}
export class ValidationError extends ServiceError {}
export class BusinessRuleError extends ServiceError {}

export type Actor = { id: string; role: Role };

type DevisLean = IDevis & { _id: Types.ObjectId };

const DAY = 86_400_000;
const CLIENT_PATH = "/espace-client/factures";

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid identifier.");
  return new Types.ObjectId(id);
}

async function nextNumber(prefix: "DEV" | "FAC"): Promise<string> {
  const year = new Date().getFullYear();
  await connectDB();
  const counter = await Counter.findOneAndUpdate(
    { key: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (!counter) throw new Error("Could not allocate a document number.");
  return `${prefix}-${year}-${String(counter.value).padStart(4, "0")}`;
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can manage quotes.");
}

function visibleFilter(actor: Actor) {
  if (actor.role === "ADMIN") return { archivedAt: { $exists: false } };
  if (actor.role === "CLIENT") return { client: objectId(actor.id), statut: { $ne: "BROUILLON" }, archivedAt: { $exists: false } };
  throw new ForbiddenError("You are not allowed to access quotes.");
}

/** Sent quotes past their validity date can no longer be accepted (StatutDevis EXPIRE). */
async function expireOutdatedDevis() {
  await Devis.updateMany(
    { statut: "ENVOYE", dateValidite: { $lt: new Date() } },
    { $set: { statut: "EXPIRE" } },
  );
}

/** Cahier: estEnRetard() / calculerResteAPayer(). Computed on read because "overdue" depends on today. */
function statutFacture(facture: Pick<IFacture, "montantTTC" | "montantPaye" | "dateEcheance">, now = new Date()): StatutFacture {
  if (facture.montantPaye >= facture.montantTTC) return "PAYEE";
  if (facture.dateEcheance < now) return "EN_RETARD";
  return facture.montantPaye > 0 ? "PARTIELLEMENT_PAYEE" : "EN_ATTENTE";
}

function splitName(nom: string) {
  return { prenom: nom.split(" ")[0] ?? "", nom: nom.split(" ").slice(1).join(" ") };
}

function toFactureView(facture: IFacture, doc: Pick<DevisLean, "_id" | "factures">): Facture {
  const devisId = doc._id;
  const last = facture.paiements.at(-1);
  return {
    id: String(facture._id ?? `${devisId}-${facture.numero}`),
    numero: facture.numero,
    type: facture.type,
    dateEmission: new Date(facture.dateEmission).toISOString(),
    dateEcheance: new Date(facture.dateEcheance).toISOString(),
    montantTTC: fromMillimes(facture.montantTTC),
    montantPaye: fromMillimes(facture.montantPaye),
    modePaiement: last?.modePaiement,
    statut: statutFacture(facture),
    datePaiement: facture.dateCompletePaiement?.toISOString(),
    paiementUnique: facture.type === "SOLDE" && !doc.factures.some((f) => f.type === "ACOMPTE"),
    paiements: facture.paiements.map((p) => ({
      montant: fromMillimes(p.montant),
      date: new Date(p.date).toISOString(),
      modePaiement: p.modePaiement,
      reference: p.reference,
    })),
  };
}

function toView(doc: DevisLean): DevisView {
  return {
    id: doc._id.toString(),
    numero: doc.numero,
    dateEmission: doc.dateEmission.toISOString(),
    dateValidite: doc.dateValidite.toISOString(),
    prestations: doc.lignes.map((line) => ({ designation: line.designation, quantite: line.quantite, prixUnitaire: fromMillimes(line.prixUnitaireHT) })),
    sousTotal: fromMillimes(doc.sousTotal),
    montantHT: fromMillimes(doc.montantHT),
    montantTVA: fromMillimes(doc.montantTVA),
    tva: doc.tva,
    montantTTC: fromMillimes(doc.montantTTC),
    remise: doc.remise,
    tauxAcompte: doc.tauxAcompte,
    statut: doc.statut,
    genereParIA: doc.genereParIA,
    commentaire: doc.commentaire,
    dateEnvoi: doc.dateEnvoi?.toISOString(),
    dateReponse: doc.dateReponse?.toISOString(),
    client: { id: doc.client.toString(), ...splitName(doc.clientSnapshot.nom), photoProfil: undefined },
    seance: {
      id: doc.seance.toString(),
      titre: doc.seanceSnapshot.titre,
      type: doc.seanceSnapshot.type,
      date: doc.seanceSnapshot.date?.toISOString(),
    },
    factures: doc.factures.map((f) => toFactureView(f, doc)),
    planPaiement: doc.planPaiement,
    modePaiementPrefere: doc.modePaiementPrefere,
    historique: doc.historique.map((h) => ({ action: h.action, statutApres: h.statutApres, date: new Date(h.date).toISOString() })),
  };
}

async function loadForAdmin(id: string, actor: Actor) {
  assertAdmin(actor);
  await connectDB();
  const doc = await Devis.findOne({ _id: objectId(id), archivedAt: { $exists: false } });
  if (!doc) throw new NotFoundError("Quote not found.");
  return doc;
}

function log(doc: { historique: IDevis["historique"]; statut: StatutDevis }, action: string, actor: Actor, statutAvant: StatutDevis) {
  doc.historique.push({ action, statutAvant, statutApres: doc.statut, par: objectId(actor.id), date: new Date() });
}

async function notify(utilisateurId: string, titre: string, message: string, lienCible: string) {
  // A failed notification must never roll back a billing operation.
  try {
    await createNotification({ utilisateurId, titre, message, type: "FACTURATION", lienCible });
  } catch (error) {
    console.error(error);
  }
}

// ---------------------------------------------------------------------------
// Quotes (Devis)
// ---------------------------------------------------------------------------

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
    numero: await nextNumber("DEV"),
    clientSnapshot: references.client,
    seanceSnapshot: references.seance,
    sousTotal: totals.brut,
    montantHT: totals.montantHT,
    montantTVA: totals.montantTVA,
    montantTTC: totals.montantTTC,
    statut: "BROUILLON",
    historique: [{ action: "CREATE", statutApres: "BROUILLON", par: objectId(actor.id), date: new Date() }],
  });
  return toView(doc.toObject() as DevisLean);
}

export async function listDevis(actor: Actor, filters: { search?: string; statut?: string } = {}) {
  await connectDB();
  await expireOutdatedDevis();
  const filter: Record<string, unknown> = { ...visibleFilter(actor) };
  if (filters.statut) filter.statut = filters.statut;
  if (filters.search) {
    const search = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ numero: search }, { "clientSnapshot.nom": search }, { "seanceSnapshot.titre": search }];
  }
  const docs = await Devis.find(filter).sort({ dateEmission: -1 }).lean<DevisLean[]>();
  return docs.map(toView);
}

export async function getDevis(id: string, actor: Actor) {
  await connectDB();
  await expireOutdatedDevis();
  const filter: Record<string, unknown> = { _id: objectId(id), ...visibleFilter(actor) };
  const doc = await Devis.findOne(filter).lean<DevisLean>();
  if (!doc) throw new NotFoundError("Quote not found.");
  return toView(doc);
}

export async function updateDevis(id: string, input: DevisInput, actor: Actor) {
  const existing = await loadForAdmin(id, actor);
  if (existing.statut !== "BROUILLON") throw new BusinessRuleError("Only draft quotes can be edited.");
  const references = await getFacturationReferences(input.client, input.seance);
  const totals = calculerTotaux(input.lignes, input.remise, input.tva);
  Object.assign(existing, {
    ...input,
    client: objectId(input.client), seance: objectId(input.seance),
    clientSnapshot: references.client, seanceSnapshot: references.seance,
    sousTotal: totals.brut, montantHT: totals.montantHT, montantTVA: totals.montantTVA, montantTTC: totals.montantTTC,
  });
  log(existing, "UPDATE", actor, "BROUILLON");
  await existing.save();
  return toView(existing.toObject() as DevisLean);
}

export async function deleteDevis(id: string, actor: Actor) {
  const doc = await loadForAdmin(id, actor);
  if (doc.factures.length > 0) throw new BusinessRuleError("This quote has invoices: delete them first.");
  // Drafts were never seen by the client; anything sent is archived to keep the audit trail.
  if (doc.statut === "BROUILLON") await doc.deleteOne();
  else { doc.archivedAt = new Date(); await doc.save(); }
}

export async function duplicateDevis(id: string, actor: Actor) {
  const original = await getDevis(id, { ...actor, role: "ADMIN" });
  const now = new Date();
  return createDevis({
    client: original.client.id,
    seance: original.seance.id,
    lignes: original.prestations.map((line) => ({ designation: line.designation, quantite: line.quantite, prixUnitaireHT: toMillimes(line.prixUnitaire) })),
    remise: original.remise,
    tva: original.tva,
    devise: "TND",
    tauxAcompte: original.tauxAcompte ?? TAUX_ACOMPTE_PAR_DEFAUT,
    dateEmission: now,
    dateValidite: new Date(now.getTime() + VALIDITE_DEVIS_JOURS * DAY),
    commentaire: original.commentaire,
    genereParIA: original.genereParIA,
  }, actor);
}

/** Cahier: "send them to the client portal". BROUILLON → ENVOYE. */
export async function sendDevis(id: string, actor: Actor) {
  const doc = await loadForAdmin(id, actor);
  if (doc.statut !== "BROUILLON") throw new BusinessRuleError("Only draft quotes can be sent.");
  if (doc.dateValidite < new Date()) throw new BusinessRuleError("The validity date has passed: edit the quote first.");
  doc.statut = "ENVOYE";
  doc.dateEnvoi = new Date();
  log(doc, "SEND", actor, "BROUILLON");
  await doc.save();
  await notify(doc.client.toString(), "New quote", `Quote ${doc.numero} for "${doc.seanceSnapshot.titre}" is waiting for your answer.`, CLIENT_PATH);
}

/** Takes a sent quote back to draft so it can be corrected (the client can no longer answer it). */
export async function withdrawDevis(id: string, actor: Actor) {
  const doc = await loadForAdmin(id, actor);
  if (doc.statut !== "ENVOYE" && doc.statut !== "EXPIRE") throw new BusinessRuleError("Only sent or expired quotes can be withdrawn.");
  const before = doc.statut;
  doc.statut = "BROUILLON";
  doc.dateEnvoi = undefined;
  log(doc, "WITHDRAW", actor, before);
  await doc.save();
}

/**
 * Cahier: accepter() / refuser(), done by the client from the portal. When accepting, the client
 * picks how they will pay (in full, or deposit + balance) and the invoices are issued right away.
 */
export async function answerDevis(id: string, reponse: ReponseDevis, actor: Actor) {
  if (actor.role !== "CLIENT") throw new ForbiddenError("Only the client can answer a quote.");
  await connectDB();
  await expireOutdatedDevis();
  const doc = await Devis.findOne({ _id: objectId(id), client: objectId(actor.id), archivedAt: { $exists: false } });
  if (!doc) throw new NotFoundError("Quote not found.");
  if (doc.statut === "EXPIRE") throw new BusinessRuleError("This quote has expired: ask the studio for a new one.");
  if (doc.statut !== "ENVOYE") throw new BusinessRuleError("This quote has already been answered.");
  doc.statut = reponse.accept ? "ACCEPTE" : "REFUSE";
  doc.dateReponse = new Date();
  log(doc, reponse.accept ? "ACCEPT" : "REFUSE", actor, "ENVOYE");
  if (reponse.accept) {
    if (reponse.planPaiement === "ACOMPTE_SOLDE" && doc.tauxAcompte <= 0) {
      throw new BusinessRuleError("This quote has no deposit: choose to pay in full.");
    }
    doc.planPaiement = reponse.planPaiement;
    doc.modePaiementPrefere = reponse.modePaiement;
    await issueInvoices(doc, actor);
  }
  await doc.save();
  await notify(
    doc.createdBy.toString(),
    reponse.accept ? "Quote accepted" : "Quote declined",
    reponse.accept
      ? `${doc.clientSnapshot.nom} accepted quote ${doc.numero} (${planPaiementLabels[reponse.planPaiement].toLowerCase()}, ${modePaiementLabels[reponse.modePaiement].toLowerCase()}).`
      : `${doc.clientSnapshot.nom} declined quote ${doc.numero}.`,
    `/dashboard/facturation/devis/${doc._id}`,
  );
}

export async function getDevisStats(actor: Actor) {
  const docs = await listDevis(actor);
  return {
    brouillons: docs.filter((d) => d.statut === "BROUILLON").length,
    envoyes: docs.filter((d) => d.statut === "ENVOYE").length,
    acceptes: docs.filter((d) => d.statut === "ACCEPTE").length,
    montantAccepte: docs.filter((d) => d.statut === "ACCEPTE").reduce((sum, d) => sum + toMillimes(d.montantTTC), 0),
  };
}

/**
 * Cahier: genererDevisIA() — "generate a quote from the session type and past pricing".
 * Reuses the lines of the latest accepted quote for the same event type; falls back to the
 * lines pre-filled from the session's pack and price. Prices are returned in TND, excluding VAT.
 */
export async function suggestDevisLignes(seanceId: string, actor: Actor): Promise<{ lignes: LignePrestation[]; source: string }> {
  assertAdmin(actor);
  const seance = await getFacturationSession(seanceId);
  await connectDB();
  const past = await Devis.findOne({ statut: "ACCEPTE", "seanceSnapshot.type": seance.typeEvenement })
    .sort({ dateReponse: -1, dateEmission: -1 })
    .lean<DevisLean>();
  if (past) {
    return {
      lignes: past.lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, prixUnitaire: fromMillimes(l.prixUnitaireHT) })),
      source: `Based on accepted quote ${past.numero} (${seance.typeEvenement}).`,
    };
  }
  return {
    lignes: seance.lignes,
    source: seance.pack ? "Based on the session's pack and price." : "No past pricing for this event type: check the prices.",
  };
}

// ---------------------------------------------------------------------------
// Invoices (Facture, embedded in Devis)
// ---------------------------------------------------------------------------

/**
 * Cahier: "generate deposit and balance invoices from an accepted quote", following the plan the
 * client chose: COMPLET = one invoice for the total, due in 7 days; ACOMPTE_SOLDE = deposit due
 * in 7 days + balance due on the session date (at least 15 days from now if the session is close).
 * The caller saves the document.
 */
async function issueInvoices(doc: HydratedDocument<IDevis>, actor: Actor) {
  if (doc.factures.length > 0) throw new BusinessRuleError("The invoices of this quote already exist.");
  const plan: PlanPaiement = doc.planPaiement ?? (doc.tauxAcompte > 0 ? "ACOMPTE_SOLDE" : "COMPLET");
  const now = new Date();
  const inDays = (days: number) => new Date(now.getTime() + days * DAY);
  const seanceDate = doc.seanceSnapshot.date ? new Date(doc.seanceSnapshot.date) : undefined;

  const parts: { type: TypeFacture; montantTTC: number; dateEcheance: Date }[] = [];
  if (plan === "COMPLET") {
    parts.push({ type: "SOLDE", montantTTC: doc.montantTTC, dateEcheance: inDays(7) });
  } else {
    const acompte = Math.round((doc.montantTTC * doc.tauxAcompte) / 100);
    parts.push({ type: "ACOMPTE", montantTTC: acompte, dateEcheance: inDays(7) });
    parts.push({
      type: "SOLDE",
      montantTTC: doc.montantTTC - acompte,
      dateEcheance: seanceDate && seanceDate > inDays(15) ? seanceDate : inDays(15),
    });
  }

  const numeros: string[] = [];
  for (const part of parts.filter((p) => p.montantTTC > 0)) {
    const numero = await nextNumber("FAC");
    numeros.push(numero);
    doc.factures.push({
      _id: new Types.ObjectId(),
      numero,
      type: part.type,
      montantTTC: part.montantTTC,
      montantPaye: 0,
      montantRestant: part.montantTTC,
      dateEmission: now,
      dateEcheance: part.dateEcheance,
      statut: "EN_ATTENTE",
      paiements: [],
    });
  }
  doc.planPaiement = plan;
  log(doc, "INVOICES", actor, doc.statut);
  await notify(
    doc.client.toString(),
    "Your invoices are ready",
    `${numeros.length > 1 ? "Invoices" : "Invoice"} ${numeros.join(" and ")} for "${doc.seanceSnapshot.titre}" ${numeros.length > 1 ? "are" : "is"} available.`,
    CLIENT_PATH,
  );
}

/** Recovery for quotes accepted before invoices were issued automatically, or after cancelling them. */
export async function regenerateFactures(devisId: string, actor: Actor) {
  const doc = await loadForAdmin(devisId, actor);
  if (doc.statut !== "ACCEPTE") throw new BusinessRuleError("Invoices can only be generated from an accepted quote.");
  await issueInvoices(doc, actor);
  await doc.save();
}

/** Cahier: enregistrerPaiement(montant) — full or partial payment. Amount in millimes. */
export async function recordPaiement(devisId: string, factureId: string, input: PaiementInput, actor: Actor) {
  const doc = await loadForAdmin(devisId, actor);
  const facture = doc.factures.find((f) => String(f._id) === factureId);
  if (!facture) throw new NotFoundError("Invoice not found.");
  const reste = facture.montantTTC - facture.montantPaye;
  if (reste <= 0) throw new BusinessRuleError("This invoice is already paid.");
  if (input.montant > reste) throw new ValidationError("The amount is higher than what remains to be paid.", "montant");
  if (input.date > new Date()) throw new ValidationError("The payment date cannot be in the future.", "date");

  facture.paiements.push({ ...input, enregistrePar: objectId(actor.id), createdAt: new Date() });
  facture.montantPaye += input.montant;
  facture.montantRestant = facture.montantTTC - facture.montantPaye;
  facture.statut = statutFacture(facture);
  if (facture.montantRestant === 0) facture.dateCompletePaiement = input.date;
  log(doc, "PAYMENT", actor, doc.statut);
  await doc.save();
  await notify(doc.client.toString(), "Payment received", `We recorded your payment on invoice ${facture.numero}. Thank you!`, CLIENT_PATH);
}

/**
 * Cancels all the invoices of a quote (e.g. wrong amounts) while nothing has been paid; the
 * deposit/balance split goes together, so they are never removed one by one.
 */
export async function cancelFactures(devisId: string, actor: Actor) {
  const doc = await loadForAdmin(devisId, actor);
  if (doc.factures.length === 0) throw new BusinessRuleError("This quote has no invoices.");
  if (doc.factures.some((f) => f.paiements.length > 0)) {
    throw new BusinessRuleError("A payment was already recorded: the invoices cannot be cancelled.");
  }
  doc.factures = [];
  log(doc, "INVOICES_CANCEL", actor, doc.statut);
  await doc.save();
}

/**
 * Cahier: "flag invoices likely to be paid late". Heuristic score (0–1) from the client's
 * history: share of their invoices that were or are late, plus how close the due date is.
 */
function risqueRetard(facture: IFacture, history: IFacture[], now: Date): number {
  const late = history.filter((f) =>
    (f.dateCompletePaiement && f.dateCompletePaiement > f.dateEcheance) ||
    (f.montantPaye < f.montantTTC && f.dateEcheance < now),
  ).length;
  const lateRatio = history.length ? late / history.length : 0;
  const daysLeft = (new Date(facture.dateEcheance).getTime() - now.getTime()) / DAY;
  const urgency = daysLeft < 0 ? 0.35 : daysLeft < 3 ? 0.2 : 0;
  const unpaidShare = facture.montantTTC ? (facture.montantTTC - facture.montantPaye) / facture.montantTTC : 0;
  return Math.min(1, Math.round((0.1 + 0.5 * lateRatio + urgency + 0.15 * unpaidShare) * 100) / 100);
}

export async function listFactures(actor: Actor): Promise<FactureAvecContexte[]> {
  await connectDB();
  const filter: Record<string, unknown> = visibleFilter(actor);
  const docs = await Devis.find(filter).sort({ dateEmission: -1 }).lean<DevisLean[]>();
  const now = new Date();
  const byClient = new Map<string, IFacture[]>();
  for (const doc of docs) {
    const key = doc.client.toString();
    byClient.set(key, [...(byClient.get(key) ?? []), ...doc.factures]);
  }
  return docs.flatMap((doc) => doc.factures.map((facture) => ({
    ...toFactureView(facture, doc),
    // The risk score is a studio-side indicator: clients never see it.
    risqueRetardIA: actor.role === "ADMIN" ? risqueRetard(facture, byClient.get(doc.client.toString()) ?? [], now) : undefined,
    devis: {
      id: doc._id.toString(),
      numero: doc.numero,
      client: { id: doc.client.toString(), ...splitName(doc.clientSnapshot.nom) },
      seance: { id: doc.seance.toString(), titre: doc.seanceSnapshot.titre },
    },
  })));
}
