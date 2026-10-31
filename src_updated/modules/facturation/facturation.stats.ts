import "server-only";
import { connectDB } from "@/lib/db";
import { Devis } from "./devis.model";

/**
 * Module : Gestion de la Facturation — read-only figures for the Statistics page (cahier §3.14).
 *
 * The Statistics module never computes an amount or a discount itself (cahier rule): it calls
 * this function. Everything here is read from what Billing already stored (quote totals,
 * discount, invoices, recorded payments), as integer millimes (1 TND = 1000 millimes). "Overdue"
 * follows the same rule as the invoice status (statutFacture): unpaid and past its due date.
 */

export type StatsFacturation = {
  devis: {
    emis: number;
    brouillons: number;
    envoyes: number;
    acceptes: number;
    refuses: number;
    expires: number;
  };
  montants: {
    /** Total incl. VAT of the quotes the client accepted. */
    devisAcceptesTTC: number;
    /** Total incl. VAT of the invoices issued in the period. */
    factureTTC: number;
    /** Payments recorded in the period. */
    encaisse: number;
    /** Right now: what is unpaid on invoices past their due date. */
    impayeEnRetard: number;
    factureEnRetard: number;
    /** Discounts granted on accepted quotes (promotions): subtotal minus amount excl. VAT. */
    remisesAccordees: number;
    /** Share of the discounts in the subtotal of the accepted quotes, %, one decimal. */
    remiseMoyennePct: number | null;
  };
  parTypeEvenement: { type: string; devisAcceptes: number; montantTTC: number }[];
  parMois: { mois: string; devisAcceptesTTC: number; encaisse: number }[];
};

const TZ = "Africa/Tunis";
const MOIS = { $dateToString: { format: "%Y-%m", date: "$dateEmission", timezone: TZ } };

type GroupStatut = { _id: string; n: number; ttc: number; sousTotal: number; ht: number };

export async function getStatsFacturation(from: Date, to: Date, now: Date = new Date()): Promise<StatsFacturation> {
  await connectDB();
  const horsArchive = { archivedAt: null };
  const dansPeriode = { dateEmission: { $gte: from, $lt: to } };

  const [parStatut, parType, parMoisDevis, facture, retard, encaisseParMois] = await Promise.all([
    Devis.aggregate<GroupStatut>([
      { $match: { ...horsArchive, ...dansPeriode } },
      {
        $group: {
          _id: "$statut",
          n: { $sum: 1 },
          ttc: { $sum: "$montantTTC" },
          sousTotal: { $sum: "$sousTotal" },
          ht: { $sum: "$montantHT" },
        },
      },
    ]),
    Devis.aggregate<{ _id: string | null; n: number; ttc: number }>([
      { $match: { ...horsArchive, ...dansPeriode, statut: "ACCEPTE" } },
      { $group: { _id: "$seanceSnapshot.type", n: { $sum: 1 }, ttc: { $sum: "$montantTTC" } } },
      { $sort: { ttc: -1 } },
    ]),
    Devis.aggregate<{ _id: string; ttc: number }>([
      { $match: { ...horsArchive, ...dansPeriode, statut: "ACCEPTE" } },
      { $group: { _id: MOIS, ttc: { $sum: "$montantTTC" } } },
    ]),
    Devis.aggregate<{ _id: null; total: number }>([
      { $match: horsArchive },
      { $unwind: "$factures" },
      { $match: { "factures.dateEmission": { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: "$factures.montantTTC" } } },
    ]),
    Devis.aggregate<{ _id: null; reste: number; n: number }>([
      { $match: horsArchive },
      { $unwind: "$factures" },
      {
        $match: {
          "factures.dateEcheance": { $lt: now },
          $expr: { $lt: ["$factures.montantPaye", "$factures.montantTTC"] },
        },
      },
      {
        $group: {
          _id: null,
          reste: { $sum: { $subtract: ["$factures.montantTTC", "$factures.montantPaye"] } },
          n: { $sum: 1 },
        },
      },
    ]),
    Devis.aggregate<{ _id: string; total: number }>([
      { $match: horsArchive },
      { $unwind: "$factures" },
      { $unwind: "$factures.paiements" },
      { $match: { "factures.paiements.date": { $gte: from, $lt: to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$factures.paiements.date", timezone: TZ } },
          total: { $sum: "$factures.paiements.montant" },
        },
      },
    ]),
  ]);

  const statut = (s: string) => parStatut.find((g) => g._id === s);
  const accepte = statut("ACCEPTE");
  const remises = accepte ? accepte.sousTotal - accepte.ht : 0;
  const mois = new Map<string, { devisAcceptesTTC: number; encaisse: number }>();
  const slot = (m: string) => {
    const cur = mois.get(m) ?? { devisAcceptesTTC: 0, encaisse: 0 };
    mois.set(m, cur);
    return cur;
  };
  for (const g of parMoisDevis) slot(g._id).devisAcceptesTTC = g.ttc;
  for (const g of encaisseParMois) slot(g._id).encaisse = g.total;

  return {
    devis: {
      emis: parStatut.reduce((s, g) => s + g.n, 0),
      brouillons: statut("BROUILLON")?.n ?? 0,
      envoyes: statut("ENVOYE")?.n ?? 0,
      acceptes: accepte?.n ?? 0,
      refuses: statut("REFUSE")?.n ?? 0,
      expires: statut("EXPIRE")?.n ?? 0,
    },
    montants: {
      devisAcceptesTTC: accepte?.ttc ?? 0,
      factureTTC: facture[0]?.total ?? 0,
      encaisse: encaisseParMois.reduce((s, g) => s + g.total, 0),
      impayeEnRetard: retard[0]?.reste ?? 0,
      factureEnRetard: retard[0]?.n ?? 0,
      remisesAccordees: remises,
      remiseMoyennePct:
        accepte && accepte.sousTotal > 0 ? Math.round((remises / accepte.sousTotal) * 1000) / 10 : null,
    },
    parTypeEvenement: parType.map((g) => ({
      type: g._id ?? "Not specified",
      devisAcceptes: g.n,
      montantTTC: g.ttc,
    })),
    parMois: [...mois]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({ mois: m, ...v })),
  };
}
