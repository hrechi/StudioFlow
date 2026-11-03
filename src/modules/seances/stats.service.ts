import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { getStatsFacturation } from "@/modules/facturation/facturation.stats";
import { findUtilisateurRefs } from "@/modules/utilisateurs/utilisateur.service";
import { Pack } from "./pack.model";
import { Seance } from "./seance.model";
import { listeMois, resoudrePeriode, taux } from "./stats.rules";
import type { PeriodeStats, StatistiquesDTO, StatsSeances, StatsTaches } from "./stats.types";
import { listTaches } from "./tache.service";
import { PRIORITES } from "./tache.dto";
import { TypeEvenement } from "./type-evenement.model";

/**
 * Statistics (cahier §3.14), admin only. Counts are aggregated here from the real data of
 * sessions, packs and tasks; every amount and discount is read from Billing
 * (getStatsFacturation) and never computed in this module.
 *
 * Definitions shown on the page:
 *  - the period filters sessions by their start date (Africa/Tunis days);
 *  - cancellation / postponement rates are over the sessions of the period that are past the
 *    request stage (pending requests excluded); "postponed" = currently postponed, or moved at
 *    least once since the counter exists (older moves left no trace);
 *  - workload ignores cancelled sessions and pending requests;
 *  - tasks are "as of now", whatever the period.
 */

const TZ = "Africa/Tunis";
const HOUR = 3_600_000;
const DAY = 86_400_000;

async function statsSeances(from: Date, to: Date): Promise<StatsSeances> {
  const periode = { dateDebut: { $gte: from, $lt: to } };
  const [parTypeStatut, parMois, parPack, taux_, charge] = await Promise.all([
    Seance.aggregate<{ _id: { type: Types.ObjectId; statut: string }; n: number }>([
      { $match: periode },
      { $group: { _id: { type: "$typeEvenement", statut: "$statut" }, n: { $sum: 1 } } },
    ]),
    Seance.aggregate<{ _id: string; n: number }>([
      { $match: periode },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$dateDebut", timezone: TZ } }, n: { $sum: 1 } } },
    ]),
    Seance.aggregate<{ _id: Types.ObjectId | null; n: number }>([
      { $match: periode },
      { $group: { _id: { $ifNull: ["$pack", null] }, n: { $sum: 1 } } },
    ]),
    Seance.aggregate<{ _id: null; total: number; annulees: number; reportees: number }>([
      { $match: { ...periode, statut: { $ne: "DEMANDE_RECUE" } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          annulees: { $sum: { $cond: [{ $eq: ["$statut", "ANNULEE"] }, 1, 0] } },
          reportees: {
            $sum: {
              $cond: [{ $or: [{ $eq: ["$statut", "REPORTEE"] }, { $gt: [{ $ifNull: ["$nombreReports", 0] }, 0] }] }, 1, 0],
            },
          },
        },
      },
    ]),
    Seance.aggregate<{ _id: Types.ObjectId; n: number; heures: number }>([
      { $match: { ...periode, statut: { $nin: ["ANNULEE", "DEMANDE_RECUE"] } } },
      { $unwind: "$equipe" },
      {
        $group: {
          _id: "$equipe.employe",
          n: { $sum: 1 },
          heures: { $sum: { $divide: [{ $subtract: ["$dateFin", "$dateDebut"] }, HOUR] } },
        },
      },
    ]),
  ]);

  const typeIds = [...new Set(parTypeStatut.map((g) => g._id.type.toString()))];
  const packIds = parPack.flatMap((g) => (g._id ? [g._id.toString()] : []));
  const [types, packs] = await Promise.all([
    typeIds.length ? TypeEvenement.find({ _id: { $in: typeIds } }).select("nom").lean<{ _id: Types.ObjectId; nom: string }[]>() : [],
    packIds.length ? Pack.find({ _id: { $in: packIds } }).select("nom").lean<{ _id: Types.ObjectId; nom: string }[]>() : [],
  ]);
  const typeNom = new Map(types.map((t) => [t._id.toString(), t.nom]));
  const packNom = new Map(packs.map((p) => [p._id.toString(), p.nom]));

  const parType = new Map<string, StatsSeances["parType"][number]>();
  for (const g of parTypeStatut) {
    const id = g._id.type.toString();
    const cur = parType.get(id) ?? { id, nom: typeNom.get(id) ?? "Deleted type", total: 0, terminees: 0, annulees: 0 };
    cur.total += g.n;
    if (g._id.statut === "TERMINEE") cur.terminees += g.n;
    if (g._id.statut === "ANNULEE") cur.annulees += g.n;
    parType.set(id, cur);
  }

  const mensuel = new Map(parMois.map((g) => [g._id, g.n]));
  const total = parTypeStatut.reduce((s, g) => s + g.n, 0);
  const avecPack = parPack.filter((g) => g._id).reduce((s, g) => s + g.n, 0);
  const t = taux_[0] ?? { total: 0, annulees: 0, reportees: 0 };

  return {
    total,
    parType: [...parType.values()].sort((a, b) => b.total - a.total),
    parMois: listeMois(from, to).map((mois) => ({ mois, total: mensuel.get(mois) ?? 0 })),
    packs: {
      top: parPack
        .flatMap((g) => (g._id ? [{ id: g._id.toString(), nom: packNom.get(g._id.toString()) ?? "Deleted pack", total: g.n }] : []))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
      sansPack: total - avecPack,
      avecPack,
    },
    taux: {
      annulees: t.annulees,
      reportees: t.reportees,
      tauxAnnulation: taux(t.annulees, t.total),
      tauxReport: taux(t.reportees, t.total),
    },
    // Filled with the task counts by getStatistiques (needs the tasks list).
    charge: charge.map((g) => ({
      employe: { id: g._id.toString(), nom: "" },
      seances: g.n,
      heures: Math.round(g.heures * 10) / 10,
      tachesOuvertes: 0,
      tachesEnRetard: 0,
    })),
  };
}

async function statsTaches(now: Date) {
  const taches = await listTaches(); // same "late" rule as the Tasks page (enRetard)
  const ouvertes = taches.filter((t) => t.statut !== "TERMINEE");
  const enRetard = ouvertes.filter((t) => t.enRetard);
  const parPriorite = Object.fromEntries(PRIORITES.map((p) => [p, 0])) as StatsTaches["parPriorite"];
  for (const t of enRetard) parPriorite[t.priorite] += 1;
  const stats: StatsTaches = {
    ouvertes: ouvertes.length,
    enRetard: enRetard.length,
    parPriorite,
    plusAnciennes: [...enRetard]
      .sort((a, b) => Date.parse(a.dateLimite!) - Date.parse(b.dateLimite!))
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        titre: t.titre,
        seance: { id: t.seance.id, titre: t.seance.titre },
        employe: t.employe ? `${t.employe.prenom} ${t.employe.nom}`.trim() : null,
        dateLimite: t.dateLimite!,
        joursRetard: Math.max(1, Math.floor((now.getTime() - Date.parse(t.dateLimite!)) / DAY)),
        priorite: t.priorite,
      })),
  };
  return { stats, taches };
}

export async function getStatistiques(code: PeriodeStats, now: Date = new Date()): Promise<StatistiquesDTO> {
  await connectDB();
  const periode = resoudrePeriode(code, now);
  const from = new Date(periode.from);
  const to = new Date(periode.to);

  const [seances, { stats: tachesStats, taches }, facturation] = await Promise.all([
    statsSeances(from, to),
    statsTaches(now),
    getStatsFacturation(from, to, now),
  ]);

  // Workload = sessions of the period + the open / late tasks of each person (as of now).
  const parEmploye = new Map<string, StatsSeances["charge"][number]>(
    seances.charge.map((c) => [c.employe.id, c] as const),
  );
  for (const t of taches.filter((x) => x.statut !== "TERMINEE" && x.employe)) {
    const id = t.employe!.id;
    const cur =
      parEmploye.get(id) ?? { employe: { id, nom: "" }, seances: 0, heures: 0, tachesOuvertes: 0, tachesEnRetard: 0 };
    cur.tachesOuvertes += 1;
    if (t.enRetard) cur.tachesEnRetard += 1;
    parEmploye.set(id, cur);
  }
  const refs = await findUtilisateurRefs([...parEmploye.keys()]);
  const charge = [...parEmploye.values()]
    .map((c) => {
      const ref = refs.get(c.employe.id);
      return { ...c, employe: { id: c.employe.id, nom: ref ? `${ref.prenom} ${ref.nom}`.trim() : "Deleted account" } };
    })
    .sort((a, b) => b.heures - a.heures || b.tachesOuvertes - a.tachesOuvertes);

  return { periode, seances: { ...seances, charge }, taches: tachesStats, facturation };
}
