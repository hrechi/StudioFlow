import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types, type HydratedDocument } from "mongoose";
import { connectDB } from "@/lib/db";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import { Devis, type IDevis, type IFacture } from "./devis.model";
import {
  applyPaiement,
  BusinessRuleError,
  ForbiddenError,
  notifyFacturation,
  notifyPaiementConfirme,
  NotFoundError,
  toObjectId,
  ValidationError,
  type Actor,
} from "./devis.service";
import type { DeclarationInput } from "./facturation.schema";
import { fromMillimes } from "./facturation.utils";
import {
  MODES_PREUVE_OBLIGATOIRE,
  modePaiementLabels,
  PREUVE_TAILLE_MAX,
  PREUVE_TYPES,
} from "./facturation.types";
import { appUrl, konnectGetPayment, konnectInitPayment, passerellesDisponibles, type Passerelle } from "./konnect";
import { millimesToEurCents, stripeCreateCheckout, stripeGetSession } from "./stripe";
import { deletePreuve, savePreuve } from "./preuve.storage";

const CLIENT_PATH = "/espace-client/factures";
const ADMIN_PATH = (devisId: Types.ObjectId | string) => `/dashboard/facturation/devis/${devisId}`;

type Loaded = { doc: HydratedDocument<IDevis>; facture: IFacture };

/** Loads an invoice the actor may pay or review: the client only their own, the admin all. */
async function loadFacture(devisId: string, factureId: string, actor: Actor): Promise<Loaded> {
  if (actor.role !== "ADMIN" && actor.role !== "CLIENT") throw new ForbiddenError("You are not allowed to access invoices.");
  await connectDB();
  const filter: Record<string, unknown> = { _id: toObjectId(devisId), archivedAt: { $exists: false } };
  if (actor.role === "CLIENT") filter.client = toObjectId(actor.id);
  const doc = await Devis.findOne(filter);
  const facture = doc?.factures.find((f) => String(f._id) === factureId);
  if (!doc || !facture) throw new NotFoundError("Invoice not found.");
  return { doc, facture };
}

const reste = (f: IFacture) => f.montantTTC - f.montantPaye;
const enAttente = (f: IFacture) => (f.declarations ?? []).filter((d) => d.statut === "EN_ATTENTE");
const tnd = (millimes: number) => `${fromMillimes(millimes).toFixed(3)} TND`;

// ---------------------------------------------------------------------------
// Offline payments: the client declares it with a proof, the studio confirms
// ---------------------------------------------------------------------------

export type PreuveFile = { name: string; type: string; size: number; data: Buffer };

/** Client: "I paid by transfer / cheque / cash" + proof. Amount in millimes. */
export async function declarePaiement(devisId: string, factureId: string, input: DeclarationInput, file: PreuveFile | null, actor: Actor): Promise<{ declarationId: string; aPreuve: boolean }> {
  if (actor.role !== "CLIENT") throw new ForbiddenError("Only the client can declare a payment.");
  const { doc, facture } = await loadFacture(devisId, factureId, actor);
  const disponible = reste(facture) - enAttente(facture).reduce((sum, d) => sum + d.montant, 0);
  if (reste(facture) <= 0) throw new BusinessRuleError("This invoice is already paid.");
  if (disponible <= 0) throw new BusinessRuleError("A proof for the remaining amount is already under review.");
  if (input.montant > disponible) throw new ValidationError(`The amount cannot exceed ${tnd(disponible)}.`, "montant");
  if (input.date > new Date()) throw new ValidationError("The payment date cannot be in the future.", "date");
  if (MODES_PREUVE_OBLIGATOIRE.includes(input.modePaiement)) {
    if (!input.reference) throw new ValidationError("Enter the transfer or cheque number.", "reference");
    if (!file) throw new ValidationError("Attach the receipt or a photo of the cheque.", "preuve");
  }
  if (file) {
    if (!(PREUVE_TYPES as readonly string[]).includes(file.type)) throw new ValidationError("The proof must be a JPG, PNG, WEBP or PDF file.", "preuve");
    if (file.size > PREUVE_TAILLE_MAX) throw new ValidationError("The proof must be 5 MB or less.", "preuve");
  }

  const fichier = file ? await savePreuve(file.data, file.name, file.type) : null;
  const sha256 = file ? createHash("sha256").update(file.data).digest("hex") : undefined;
  const declarationId = new Types.ObjectId();
  facture.declarations ??= [];
  facture.declarations.push({
    _id: declarationId,
    ...input,
    preuve: fichier && file ? { fichier, nom: file.name.slice(0, 200), contentType: file.type, taille: file.size, sha256 } : undefined,
    analyseIA: fichier ? { verdict: "EN_COURS", resume: "The AI is reading the proof.", verifications: [] } : undefined,
    statut: "EN_ATTENTE",
    declarePar: toObjectId(actor.id),
    createdAt: new Date(),
  });
  try {
    await doc.save();
  } catch (error) {
    if (fichier) await deletePreuve(fichier);
    throw error;
  }
  await notifyFacturation(
    doc.createdBy.toString(),
    "Payment proof to check",
    `${doc.clientSnapshot.nom} declared ${tnd(input.montant)} by ${modePaiementLabels[input.modePaiement].toLowerCase()} on invoice ${facture.numero}.`,
    ADMIN_PATH(doc._id),
  );
  return { declarationId: declarationId.toString(), aPreuve: !!fichier };
}

/** Admin: the money arrived → the declaration becomes a real payment and the client is told. */
export async function validateDeclaration(devisId: string, factureId: string, declarationId: string, actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can confirm payments.");
  const { doc, facture } = await loadFacture(devisId, factureId, actor);
  const declaration = facture.declarations?.find((d) => String(d._id) === declarationId);
  if (!declaration) throw new NotFoundError("Declaration not found.");
  if (declaration.statut !== "EN_ATTENTE") throw new BusinessRuleError("This declaration was already processed.");
  if (declaration.montant > reste(facture)) throw new BusinessRuleError(`Only ${tnd(reste(facture))} remain on this invoice: reject it and ask for a corrected proof.`);

  applyPaiement(doc, facture, {
    montant: declaration.montant,
    date: declaration.date,
    modePaiement: declaration.modePaiement,
    reference: declaration.reference,
  }, actor);
  declaration.statut = "VALIDEE";
  declaration.traitePar = toObjectId(actor.id);
  declaration.traiteLe = new Date();
  await doc.save();
  await notifyPaiementConfirme(doc, facture, declaration.montant);
}

/** Admin: the proof does not match what was received; the client is told why and can send another. */
export async function rejectDeclaration(devisId: string, factureId: string, declarationId: string, motif: string, actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can reject payments.");
  const { doc, facture } = await loadFacture(devisId, factureId, actor);
  const declaration = facture.declarations?.find((d) => String(d._id) === declarationId);
  if (!declaration) throw new NotFoundError("Declaration not found.");
  if (declaration.statut !== "EN_ATTENTE") throw new BusinessRuleError("This declaration was already processed.");
  declaration.statut = "REJETEE";
  declaration.motifRejet = motif;
  declaration.traitePar = toObjectId(actor.id);
  declaration.traiteLe = new Date();
  await doc.save();
  await notifyFacturation(
    doc.client.toString(),
    "Payment proof rejected",
    `Your proof for invoice ${facture.numero} was not accepted: ${motif}`,
    CLIENT_PATH,
  );
}

/** The proof file of a declaration, for the admin or the client who sent it. */
export async function findPreuve(fileId: string, actor: Actor): Promise<{ fichier: Types.ObjectId; nom: string } | null> {
  if (actor.role !== "ADMIN" && actor.role !== "CLIENT") return null;
  if (!Types.ObjectId.isValid(fileId)) return null;
  await connectDB();
  const fichier = new Types.ObjectId(fileId);
  const filter: Record<string, unknown> = { "factures.declarations.preuve.fichier": fichier };
  if (actor.role === "CLIENT") filter.client = toObjectId(actor.id);
  const doc = await Devis.findOne(filter).lean<IDevis>();
  const declaration = doc?.factures.flatMap((f) => f.declarations ?? []).find((d) => d.preuve?.fichier.equals(fichier));
  return declaration?.preuve ? { fichier, nom: declaration.preuve.nom } : null;
}

// ---------------------------------------------------------------------------
// Online payments (Konnect in TND, Stripe test mode in EUR, or the local simulator)
// ---------------------------------------------------------------------------

/** Client: opens a checkout for what is left on the invoice and returns the URL to go to. */
export async function startPaiementEnLigne(devisId: string, factureId: string, passerelle: Passerelle, actor: Actor): Promise<{ url: string }> {
  if (actor.role !== "CLIENT") throw new ForbiddenError("Only the client can pay online.");
  const disponibles = passerellesDisponibles();
  if (disponibles.length === 0) throw new BusinessRuleError("Online payment is not available yet: pay by transfer, cheque or cash and send the proof.");
  if (!disponibles.includes(passerelle)) throw new BusinessRuleError("This payment method is not available.");
  const mode = passerelle;
  const { doc, facture } = await loadFacture(devisId, factureId, actor);
  const montant = reste(facture) - enAttente(facture).reduce((sum, d) => sum + d.montant, 0);
  if (montant <= 0) throw new BusinessRuleError("Nothing left to pay on this invoice.");

  try {
    return await openCheckout(doc, facture, montant, mode, actor);
  } catch (error) {
    if (error instanceof BusinessRuleError) throw error;
    // Gateway down or misconfigured: log the details, tell the client what they can do instead.
    console.error(error);
    const nom = mode === "STRIPE" ? "Stripe" : mode === "KONNECT" ? "Konnect" : "The test checkout";
    throw new BusinessRuleError(`${nom} is not reachable right now. Try another payment method, or pay by transfer and send the proof.`);
  }
}

async function openCheckout(doc: HydratedDocument<IDevis>, facture: IFacture, montant: number, mode: Passerelle, actor: Actor): Promise<{ url: string }> {
  let ref: string;
  let url: string;
  let devise: { devise: "TND" | "EUR"; montantDevise?: number } = { devise: "TND" };
  if (mode === "STRIPE") {
    const montantDevise = millimesToEurCents(montant);
    const session = await stripeCreateCheckout({
      amountCents: montantDevise,
      name: `ReFrame — invoice ${facture.numero}`,
      description: `${doc.seanceSnapshot.titre} · ${tnd(montant)} (charged in EUR)`,
      reference: facture.numero,
      email: doc.clientSnapshot.email,
      successUrl: `${appUrl()}/api/facturation/paiements/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl()}/espace-client/factures?paiement=failed`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    ref = session.id;
    url = session.url;
    devise = { devise: "EUR", montantDevise };
  } else if (mode === "KONNECT") {
    const client = await findUtilisateurById(actor.id);
    const result = await konnectInitPayment({
      amount: montant,
      orderId: facture.numero,
      description: `ReFrame — invoice ${facture.numero} (${doc.seanceSnapshot.titre})`,
      webhook: `${appUrl()}/api/facturation/paiements/konnect`,
      client: {
        firstName: client?.prenom ?? doc.clientSnapshot.nom,
        lastName: client?.nom ?? "",
        email: client?.email ?? doc.clientSnapshot.email,
        phoneNumber: client?.telephone?.replace(/\D/g, "").slice(-8) || undefined,
      },
    });
    ref = result.paymentRef;
    url = result.payUrl;
  } else {
    ref = `SIM-${randomBytes(8).toString("hex")}`;
    url = `/espace-client/factures/paiement-test?ref=${ref}`;
  }
  facture.paiementsEnLigne ??= [];
  facture.paiementsEnLigne.push({ ref, fournisseur: mode, montant, ...devise, statut: "EN_ATTENTE", createdAt: new Date() });
  await doc.save();
  return { url };
}

/** Details of a pending simulated checkout, for the test payment page (owner only). */
export async function getPaiementSimule(ref: string, actor: Actor) {
  if (actor.role !== "CLIENT" || !passerellesDisponibles().includes("SIMULATION")) return null;
  await connectDB();
  const doc = await Devis.findOne({ client: toObjectId(actor.id), "factures.paiementsEnLigne.ref": ref }).lean<IDevis>();
  const facture = doc?.factures.find((f) => f.paiementsEnLigne?.some((p) => p.ref === ref));
  const paiement = facture?.paiementsEnLigne?.find((p) => p.ref === ref);
  if (!doc || !facture || !paiement) return null;
  return { ref, numero: facture.numero, montant: fromMillimes(paiement.montant), statut: paiement.statut, seance: doc.seanceSnapshot.titre };
}

/**
 * Settles an online checkout after asking the gateway (never trusting the callback itself).
 * Idempotent: the webhook and the payer's redirect can both arrive.
 */
export async function confirmPaiementEnLigne(ref: string, simulated?: { success: boolean; actor: Actor }): Promise<"PAYE" | "ECHOUE" | "EN_ATTENTE" | "INCONNU"> {
  await connectDB();
  const filter: Record<string, unknown> = { "factures.paiementsEnLigne.ref": ref };
  if (simulated) filter.client = toObjectId(simulated.actor.id);
  const doc = await Devis.findOne(filter);
  const facture = doc?.factures.find((f) => f.paiementsEnLigne?.some((p) => p.ref === ref));
  const paiement = facture?.paiementsEnLigne?.find((p) => p.ref === ref);
  if (!doc || !facture || !paiement) return "INCONNU";
  if (paiement.statut !== "EN_ATTENTE") return paiement.statut;

  let paid: boolean;
  let montant = paiement.montant;
  if (paiement.fournisseur === "SIMULATION") {
    if (!simulated || !passerellesDisponibles().includes("SIMULATION")) return "EN_ATTENTE";
    paid = simulated.success;
  } else if (paiement.fournisseur === "STRIPE") {
    const session = await stripeGetSession(ref);
    if (session.status === "expired") {
      paid = false;
    } else if (session.payment_status !== "paid") {
      return "EN_ATTENTE";
    } else {
      // The charge must match what was asked for this invoice (amount and currency).
      if (session.currency !== "eur" || session.amount_total !== paiement.montantDevise) {
        console.error(`Stripe session ${ref} amount mismatch: ${session.amount_total} ${session.currency}`);
        return "EN_ATTENTE";
      }
      paid = true;
    }
  } else {
    const remote = await konnectGetPayment(ref);
    if (remote.status !== "completed") return "EN_ATTENTE";
    paid = true;
    montant = Math.min(remote.reachedAmount || remote.amount || paiement.montant, reste(facture));
  }

  // Atomic claim: only one of two concurrent confirmations (webhook + redirect) gets past this.
  const claimed = await Devis.updateOne(
    { _id: doc._id, "factures.paiementsEnLigne": { $elemMatch: { ref, statut: "EN_ATTENTE" } } },
    { $set: { "factures.$[].paiementsEnLigne.$[p].statut": paid ? "PAYE" : "ECHOUE", "factures.$[].paiementsEnLigne.$[p].payeLe": new Date() } },
    { arrayFilters: [{ "p.ref": ref }] },
  );
  if (claimed.modifiedCount === 0) return paid ? "PAYE" : "ECHOUE";
  if (!paid) return "ECHOUE";

  const fresh = await Devis.findById(doc._id);
  const target = fresh?.factures.find((f) => String(f._id) === String(facture._id));
  if (!fresh || !target) return "INCONNU";
  montant = Math.min(montant, reste(target));
  if (montant > 0) {
    applyPaiement(fresh, target, {
      montant,
      date: new Date(),
      modePaiement: "CARTE",
      reference: paiement.fournisseur === "STRIPE"
        ? `Stripe ${((paiement.montantDevise ?? 0) / 100).toFixed(2)} EUR · ${ref.slice(0, 24)}`
        : `${paiement.fournisseur === "KONNECT" ? "Konnect" : "Test"} ${ref}`,
    }, { id: fresh.client.toString(), role: "CLIENT" });
    await fresh.save();
  }
  return finish(fresh, target, montant);
}

async function finish(doc: HydratedDocument<IDevis>, facture: IFacture, montant: number): Promise<"PAYE"> {
  await notifyPaiementConfirme(doc, facture, montant);
  await notifyFacturation(doc.createdBy.toString(), "Online payment received", `${doc.clientSnapshot.nom} paid ${tnd(montant)} online on invoice ${facture.numero}.`, ADMIN_PATH(doc._id));
  return "PAYE";
}
