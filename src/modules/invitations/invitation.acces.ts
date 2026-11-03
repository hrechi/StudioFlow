/**
 * Module : Gestion des Invitations. Link with Facturation.
 *
 * The editor is sold through the same path as a session: quote → the client accepts → invoice →
 * online payment or proof confirmed by the admin. "Unlocked" is never stored; it is read from the
 * invitation invoice, so the three ways of recording a payment all unlock it without extra code.
 */
import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Devis, type IDevis } from "@/modules/facturation/devis.model";
import {
  BusinessRuleError,
  ForbiddenError,
  nextNumber,
  toObjectId,
  type Actor,
} from "@/modules/facturation/devis.service";
import { calculerTotaux, fromMillimes, toMillimes } from "@/modules/facturation/facturation.utils";
import { VALIDITE_DEVIS_JOURS } from "@/modules/facturation/facturation.types";
import { findUtilisateurById, listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import { Invitation, ParametresInvitation } from "./invitation.model";
import {
  PRIX_HT_PAR_DEFAUT,
  TITRE_DEVIS_INVITATION,
  TVA_INVITATION_PAR_DEFAUT,
  TYPE_DEVIS_INVITATION,
  type AccesClientView,
  type AccesInvitation,
  type EtatAcces,
  type ParametresInvitationView,
} from "./invitation.types";

type DevisLean = IDevis & { _id: Types.ObjectId };

const DAY = 86_400_000;
const NON_ARCHIVE = { objet: "INVITATION" as const, archivedAt: { $exists: false } };

const estPaye = (d: DevisLean) =>
  d.statut === "ACCEPTE" && d.factures.length > 0 && d.factures.every((f) => f.montantPaye >= f.montantTTC);

const restant = (d: DevisLean) =>
  d.factures.reduce((sum, f) => sum + Math.max(0, f.montantTTC - f.montantPaye), 0);

function etatDevis(d: DevisLean): EtatAcces {
  if (estPaye(d)) return "DEBLOQUE";
  if (d.statut === "ENVOYE") return d.dateValidite < new Date() ? "VERROUILLE" : "DEVIS_A_ACCEPTER";
  if (d.statut !== "ACCEPTE") return "VERROUILLE";
  if (d.factures.length === 0) return "FACTURE_A_EMETTRE";
  const preuve = d.factures.some((f) => (f.declarations ?? []).some((x) => x.statut === "EN_ATTENTE"));
  return preuve ? "PREUVE_EN_VERIFICATION" : "FACTURE_A_PAYER";
}

const debloqueLe = (d: DevisLean) =>
  d.factures.map((f) => f.dateCompletePaiement).filter((x): x is Date => !!x).sort((a, b) => +b - +a)[0];

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

async function lireParametres() {
  await connectDB();
  const doc = await ParametresInvitation.findOne({ cle: "default" }).lean();
  return { prixHT: doc?.prixHT ?? toMillimes(PRIX_HT_PAR_DEFAUT), tva: doc?.tva ?? TVA_INVITATION_PAR_DEFAUT };
}

const ligneEditeur = (prixHT: number) => ({ designation: TITRE_DEVIS_INVITATION, quantite: 1, prixUnitaireHT: prixHT });

export async function getParametresInvitation(): Promise<ParametresInvitationView> {
  const { prixHT, tva } = await lireParametres();
  return { prixHT: fromMillimes(prixHT), tva, prixTTC: fromMillimes(calculerTotaux([ligneEditeur(prixHT)], 0, tva).montantTTC) };
}

/** Admin: the new price applies to the next quotes; quotes already sent keep theirs. */
export async function setParametresInvitation(input: { prixHT: number; tva: number }, actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can set the price.");
  await connectDB();
  await ParametresInvitation.updateOne(
    { cle: "default" },
    { $set: { prixHT: toMillimes(input.prixHT), tva: input.tva } },
    { upsert: true, runValidators: true },
  );
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

async function devisDuClient(clientId: string): Promise<DevisLean[]> {
  await connectDB();
  return Devis.find({ ...NON_ARCHIVE, client: toObjectId(clientId) }).sort({ createdAt: -1 }).lean<DevisLean[]>();
}

export async function getAccesInvitation(clientId: string): Promise<AccesInvitation> {
  const [devis, parametres] = await Promise.all([devisDuClient(clientId), getParametresInvitation()]);
  const paye = devis.find(estPaye);
  if (paye) {
    return {
      etat: "DEBLOQUE",
      prixTTC: fromMillimes(paye.montantTTC),
      devisId: paye._id.toString(),
      devisNumero: paye.numero,
      debloqueLe: debloqueLe(paye)?.toISOString(),
    };
  }
  const ouvert = devis.find((d) => etatDevis(d) !== "VERROUILLE");
  if (!ouvert) return { etat: "VERROUILLE", prixTTC: parametres.prixTTC };
  return {
    etat: etatDevis(ouvert),
    prixTTC: fromMillimes(ouvert.montantTTC),
    devisId: ouvert._id.toString(),
    devisNumero: ouvert.numero,
    restant: fromMillimes(restant(ouvert)),
  };
}

/** The server-side lock: every read and write of an invitation goes through this. */
export async function assertDebloque(actor: Actor) {
  if (actor.role !== "CLIENT") throw new ForbiddenError("Invitations belong to client accounts.");
  const { etat } = await getAccesInvitation(actor.id);
  if (etat !== "DEBLOQUE") throw new ForbiddenError("The invitation editor is locked until your payment is confirmed.");
}

/**
 * Client: "I want the editor". Opens a quote at the current price, ready to accept from their
 * invoices page. Without a deposit, because the editor is unlocked on the whole amount.
 * Asking again returns the quote already in progress.
 */
export async function demanderDeblocage(actor: Actor): Promise<{ devisId: string }> {
  if (actor.role !== "CLIENT") throw new ForbiddenError("Only a client can request the editor.");
  const acces = await getAccesInvitation(actor.id);
  if (acces.etat === "DEBLOQUE") throw new BusinessRuleError("Your invitation editor is already unlocked.");
  if (acces.devisId) return { devisId: acces.devisId };

  const [client, admins, { prixHT, tva }] = await Promise.all([findUtilisateurById(actor.id), listAdminRefs(), lireParametres()]);
  if (!client) throw new ForbiddenError("Client not found.");
  const admin = admins[0];
  if (!admin) throw new BusinessRuleError("The studio cannot take this request right now. Please try again later.");

  // A quote past its date still marked as sent would block the new one on the unique index.
  await Devis.updateMany({ ...NON_ARCHIVE, client: toObjectId(actor.id), statut: "ENVOYE", dateValidite: { $lt: new Date() } }, { $set: { statut: "EXPIRE" } });
  const lignes = [ligneEditeur(prixHT)];
  const totaux = calculerTotaux(lignes, 0, tva);
  const maintenant = new Date();
  try {
    const doc = await Devis.create({
      objet: "INVITATION",
      numero: await nextNumber("DEV"),
      client: toObjectId(actor.id),
      clientSnapshot: { nom: `${client.prenom} ${client.nom}`.trim(), email: client.email },
      seanceSnapshot: { titre: TITRE_DEVIS_INVITATION, type: TYPE_DEVIS_INVITATION },
      lignes,
      remise: 0,
      tva,
      devise: "TND",
      tauxAcompte: 0,
      sousTotal: totaux.brut,
      montantHT: totaux.montantHT,
      montantTVA: totaux.montantTVA,
      montantTTC: totaux.montantTTC,
      statut: "ENVOYE",
      dateEmission: maintenant,
      dateEnvoi: maintenant,
      dateValidite: new Date(maintenant.getTime() + VALIDITE_DEVIS_JOURS * DAY),
      // The admin who receives the payment alerts of this quote (see paiement.service.ts).
      createdBy: toObjectId(admin.id),
      historique: [{ action: "CREATE", statutApres: "ENVOYE", par: toObjectId(actor.id), date: maintenant }],
    });
    return { devisId: doc._id.toString() };
  } catch (error) {
    // Two clicks at once: the unique index let one through, use that quote.
    if ((error as { code?: number }).code === 11000) {
      const existant = await Devis.findOne({ ...NON_ARCHIVE, client: toObjectId(actor.id), statut: "ENVOYE" }).lean<DevisLean>();
      if (existant) return { devisId: existant._id.toString() };
    }
    throw error;
  }
}

/** Admin overview: who asked for the editor, where their payment stands, who is unlocked. */
export async function listAccesClients(actor: Actor): Promise<AccesClientView[]> {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can see this.");
  await connectDB();
  const docs = await Devis.find(NON_ARCHIVE).sort({ createdAt: -1 }).lean<DevisLean[]>();
  const comptes = await Invitation.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { client: { $in: docs.map((d) => d.client) } } },
    { $group: { _id: "$client", n: { $sum: 1 } } },
  ]);
  const parClient = new Map(comptes.map((c) => [c._id.toString(), c.n]));
  return docs.map((d) => ({
    devisId: d._id.toString(),
    devisNumero: d.numero,
    client: d.clientSnapshot.nom,
    etat: etatDevis(d),
    montantTTC: fromMillimes(d.montantTTC),
    restant: fromMillimes(d.factures.length ? restant(d) : d.montantTTC),
    debloqueLe: debloqueLe(d)?.toISOString(),
    invitations: parClient.get(d.client.toString()) ?? 0,
  }));
}
