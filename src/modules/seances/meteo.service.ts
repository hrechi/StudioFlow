import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { listAdminRefs } from "@/modules/utilisateurs/utilisateur.service";
import { AlerteMeteo, type IAlerteMeteo } from "./alerte-meteo.model";
import { Lieu, type ILieu } from "./lieu.model";
import { lieuOccupe } from "./lieu.service";
import { MeteoParametres, type IMeteoParametres } from "./meteo-parametres.model";
import { candidatsReport, decrireDepassement, evaluer, resumerFenetre } from "./meteo.rules";
import type { SeuilsMeteoInput } from "./meteo.schemas";
import {
  SEUILS_METEO_PAR_DEFAUT,
  type AlerteMeteoDTO,
  type PrevisionHoraire,
  type PropositionsMeteoDTO,
  type ResultatVerificationMeteo,
  type ResumePrevision,
  type SeuilsMeteo,
  type TypeDecisionMeteo,
  type VerificationMeteoDTO,
} from "./meteo.types";
import { fetchPrevisions, MeteoUnavailableError } from "./openmeteo.client";
import { Seance, type ISeance } from "./seance.model";
import { creneauEquipeLibre, replanifierSeance } from "./seance.service";

/**
 * Weather watch — the rule of this module: it OBSERVES and PROPOSES, only an admin DECIDES.
 *  - verifierMeteo(): reads forecasts, opens / refreshes / closes alerts, notifies the admins.
 *    It never touches a session.
 *  - proposerOptions(): computed fresh when the admin opens an alert (forecast, team schedule and
 *    location availability are re-checked); nothing is stored or applied.
 *  - appliquerReport / appliquerLieuAlternatif: run only on an explicit admin click, re-validate
 *    that the choice is still one of the current proposals, then move the session through
 *    replanifierSeance (which re-checks the team schedule) and notify the client.
 */

type SeanceLean = ISeance & { _id: Types.ObjectId };
type LieuLean = ILieu & { _id: Types.ObjectId };
type AlerteLean = IAlerteMeteo & { _id: Types.ObjectId };

const DAY = 86_400_000;

/** Stored texts (notifications, decision log) must read the same on any server: Tunis time. */
const tunisFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Tunis",
});
const formatDateTime = (value: Date) => tunisFormatter.format(value);
const CHECKED: ISeance["statut"][] = ["EN_ATTENTE_CONFIRMATION", "CONFIRMEE"];
const OPEN_ALERT_NOT_FOUND = "This alert is no longer open.";

// ── Settings ────────────────────────────────────────────────────────────────

function toSeuils(doc: IMeteoParametres | null): SeuilsMeteo {
  if (!doc) return SEUILS_METEO_PAR_DEFAUT;
  return {
    actif: doc.actif,
    pluieProbabiliteMax: doc.pluieProbabiliteMax,
    pluieMmMax: doc.pluieMmMax,
    ventKmhMax: doc.ventKmhMax,
    temperatureMinC: doc.temperatureMinC,
    temperatureMaxC: doc.temperatureMaxC,
    horizonJours: doc.horizonJours,
  };
}

export async function getSeuils(): Promise<SeuilsMeteo> {
  await connectDB();
  return toSeuils(await MeteoParametres.findOne({ cle: "default" }).lean<IMeteoParametres>());
}

export async function saveSeuils(input: SeuilsMeteoInput): Promise<void> {
  await connectDB();
  await MeteoParametres.updateOne({ cle: "default" }, { $set: { ...input } }, { upsert: true });
}

export async function getDerniereVerification(): Promise<VerificationMeteoDTO | null> {
  await connectDB();
  const doc = await MeteoParametres.findOne({ cle: "default" }).lean<IMeteoParametres>();
  const v = doc?.derniereVerification;
  if (!v) return null;
  return {
    desactive: false,
    le: v.le.toISOString(),
    seancesVerifiees: v.seancesVerifiees,
    alertesCreees: v.alertesCreees,
    alertesMisesAJour: v.alertesMisesAJour,
    alertesObsoletes: v.alertesObsoletes,
    sansCoordonnees: v.sansCoordonnees,
    erreurs: v.erreurs,
  };
}

// ── Alerts (read) ───────────────────────────────────────────────────────────

function toAlerteDTO(a: AlerteLean): AlerteMeteoDTO {
  return {
    id: a._id.toString(),
    statut: a.statut,
    seance: {
      id: a.seance.toString(),
      titre: a.seanceTitre,
      dateDebut: a.dateDebut.toISOString(),
      dateFin: a.dateFin.toISOString(),
    },
    lieu: { id: a.lieu.toString(), nom: a.lieuNom },
    resume: {
      probabilitePluiePct: a.resume.probabilitePluiePct ?? null,
      pluieMm: a.resume.pluieMm ?? null,
      ventKmh: a.resume.ventKmh ?? null,
      temperatureMinC: a.resume.temperatureMinC ?? null,
      temperatureMaxC: a.resume.temperatureMaxC ?? null,
    },
    depassements: a.depassements.map((d) => ({ critere: d.critere, valeur: d.valeur, seuil: d.seuil })),
    decision: a.decision
      ? { type: a.decision.type, detail: a.decision.detail, le: a.decision.le.toISOString() }
      : undefined,
    verifieLe: a.verifieLe.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}

export async function listAlertes(): Promise<{ ouvertes: AlerteMeteoDTO[]; historique: AlerteMeteoDTO[] }> {
  await connectDB();
  const [ouvertes, historique] = await Promise.all([
    AlerteMeteo.find({ statut: "OUVERTE" }).sort({ dateDebut: 1 }).lean<AlerteLean[]>(),
    AlerteMeteo.find({ statut: { $ne: "OUVERTE" } }).sort({ updatedAt: -1 }).limit(15).lean<AlerteLean[]>(),
  ]);
  return { ouvertes: ouvertes.map(toAlerteDTO), historique: historique.map(toAlerteDTO) };
}

export async function countAlertesOuvertes(): Promise<number> {
  await connectDB();
  return AlerteMeteo.countDocuments({ statut: "OUVERTE" });
}

// ── The check ───────────────────────────────────────────────────────────────

function messageAlerte(titre: string, debut: Date, lieu: string, depassements: ReturnType<typeof evaluer>) {
  const raisons = depassements.map(decrireDepassement).join("; ");
  return `“${titre}” on ${formatDateTime(debut)} at ${lieu}: ${raisons}. Open the weather page to choose: postpone, change location or keep.`.slice(
    0,
    500,
  );
}

async function notifierAdmins(titre: string, message: string): Promise<void> {
  const admins = await listAdminRefs();
  await Promise.all(
    admins.map((a) =>
      createNotification({
        utilisateurId: a.id,
        type: "SEANCE",
        titre,
        message,
        lienCible: "/dashboard/meteo",
      }).catch((error: unknown) => console.error(error)),
    ),
  );
}

/**
 * Checks the outdoor sessions of the next `horizonJours` days. Safe to run as often as wanted
 * (cron or the admin's button): an open alert is updated, not duplicated, and the admins are
 * notified only when an alert is created. Never modifies a session.
 */
export async function verifierMeteo(now: Date = new Date()): Promise<ResultatVerificationMeteo> {
  await connectDB();
  const seuils = await getSeuils();
  const resultat: ResultatVerificationMeteo = {
    desactive: !seuils.actif,
    seancesVerifiees: 0,
    alertesCreees: 0,
    alertesMisesAJour: 0,
    alertesObsoletes: 0,
    sansCoordonnees: 0,
    erreurs: 0,
  };
  if (!seuils.actif) return resultat;

  const limite = new Date(now.getTime() + seuils.horizonJours * DAY);
  const seances = await Seance.find({
    lieuId: { $exists: true },
    statut: { $in: CHECKED },
    dateDebut: { $gt: now, $lt: limite },
  }).lean<SeanceLean[]>();

  const lieux = seances.length
    ? await Lieu.find({
        _id: { $in: [...new Set(seances.map((s) => s.lieuId!.toString()))] },
        exterieur: true,
      }).lean<LieuLean[]>()
    : [];
  const lieuById = new Map(lieux.map((l) => [l._id.toString(), l]));

  const previsions = new Map<string, PrevisionHoraire | null>();
  const echecs = new Set<string>();
  for (const l of lieux) {
    if (l.latitude == null || l.longitude == null) continue;
    try {
      previsions.set(l._id.toString(), await fetchPrevisions(l.latitude, l.longitude));
    } catch (error) {
      if (!(error instanceof MeteoUnavailableError)) console.error(error);
      echecs.add(l._id.toString());
      resultat.erreurs += 1;
    }
  }

  for (const s of seances) {
    const lieu = lieuById.get(s.lieuId!.toString());
    if (!lieu) continue; // indoor location: the weather does not apply
    if (lieu.latitude == null || lieu.longitude == null) {
      resultat.sansCoordonnees += 1;
      continue;
    }
    const prev = previsions.get(lieu._id.toString());
    if (!prev) continue; // forecast unavailable: leave the existing alert as it is
    const resume = resumerFenetre(prev, s.dateDebut.getTime(), s.dateFin.getTime());
    if (!resume) continue; // session beyond the forecast
    resultat.seancesVerifiees += 1;
    const depassements = evaluer(resume, seuils);

    const derniere = await AlerteMeteo.findOne({ seance: s._id }).sort({ createdAt: -1 }).lean<AlerteLean>();
    if (derniere?.statut === "OUVERTE") {
      if (depassements.length === 0) {
        await AlerteMeteo.updateOne({ _id: derniere._id }, { $set: { statut: "OBSOLETE", verifieLe: now } });
        resultat.alertesObsoletes += 1;
      } else {
        await AlerteMeteo.updateOne({ _id: derniere._id }, { $set: { resume, depassements, verifieLe: now } });
        resultat.alertesMisesAJour += 1;
      }
      continue;
    }
    if (depassements.length === 0) continue;
    // Already decided for this very slot and place: do not ask again.
    if (
      derniere &&
      (derniere.statut === "IGNOREE" || derniere.statut === "TRAITEE") &&
      derniere.dateDebut.getTime() === s.dateDebut.getTime() &&
      derniere.lieu.toString() === lieu._id.toString()
    ) {
      continue;
    }
    try {
      await AlerteMeteo.create({
        seance: s._id,
        lieu: lieu._id,
        seanceTitre: s.titre,
        lieuNom: lieu.nom,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        resume,
        depassements,
        statut: "OUVERTE",
        verifieLe: now,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) continue; // concurrent check created it
      throw error;
    }
    resultat.alertesCreees += 1;
    await notifierAdmins(
      "Weather alert for an outdoor session",
      messageAlerte(s.titre, s.dateDebut, lieu.nom, depassements),
    );
  }

  // Close open alerts that no longer describe the session (cancelled, past, moved, other place).
  const ouvertes = await AlerteMeteo.find({ statut: "OUVERTE" }).lean<AlerteLean[]>();
  if (ouvertes.length) {
    const liees = await Seance.find({ _id: { $in: ouvertes.map((a) => a.seance) } })
      .select("statut dateDebut lieuId")
      .lean<SeanceLean[]>();
    const parId = new Map(liees.map((x) => [x._id.toString(), x]));
    for (const a of ouvertes) {
      const x = parId.get(a.seance.toString());
      const toujoursValable =
        !!x &&
        CHECKED.includes(x.statut) &&
        x.dateDebut.getTime() > now.getTime() &&
        x.dateDebut.getTime() === a.dateDebut.getTime() &&
        x.lieuId?.toString() === a.lieu.toString();
      if (!toujoursValable) {
        await AlerteMeteo.updateOne({ _id: a._id, statut: "OUVERTE" }, { $set: { statut: "OBSOLETE", verifieLe: now } });
        resultat.alertesObsoletes += 1;
      }
    }
  }

  await MeteoParametres.updateOne(
    { cle: "default" },
    {
      $set: {
        derniereVerification: {
          le: now,
          seancesVerifiees: resultat.seancesVerifiees,
          alertesCreees: resultat.alertesCreees,
          alertesMisesAJour: resultat.alertesMisesAJour,
          alertesObsoletes: resultat.alertesObsoletes,
          sansCoordonnees: resultat.sansCoordonnees,
          erreurs: resultat.erreurs,
        },
      },
      $setOnInsert: SEUILS_METEO_PAR_DEFAUT,
    },
    { upsert: true },
  );
  return resultat;
}

// ── Proposals ───────────────────────────────────────────────────────────────

async function chargerAlerteOuverte(alerteId: string) {
  await connectDB();
  const alerte = await AlerteMeteo.findOne({ _id: alerteId, statut: "OUVERTE" }).lean<AlerteLean>();
  if (!alerte) throw new ServiceError(OPEN_ALERT_NOT_FOUND);
  const seance = await Seance.findById(alerte.seance).lean<SeanceLean>();
  if (!seance || !CHECKED.includes(seance.statut)) {
    throw new ServiceError("This session was cancelled or changed. Run a new check.");
  }
  const lieu = await Lieu.findById(alerte.lieu).lean<LieuLean>();
  if (!lieu) throw new ServiceError("The location of this session no longer exists.");
  return { alerte, seance, lieu };
}

/** Options for one alert, from the live forecast, the team schedule and the places' availability. */
async function calculerPropositions(alerteId: string) {
  const { alerte, seance, lieu } = await chargerAlerteOuverte(alerteId);
  const seuils = await getSeuils();
  const debut = seance.dateDebut;
  const fin = seance.dateFin;

  // 1. Alternative locations (disabled, busy or — if outdoors — also bad weather ones are dropped)
  const alternatifs = lieu.lieuxAlternatifs.length
    ? await Lieu.find({ _id: { $in: lieu.lieuxAlternatifs } }).lean<LieuLean[]>()
    : [];
  const lieuxAlternatifs: PropositionsMeteoDTO["lieuxAlternatifs"] = [];
  for (const alt of alternatifs) {
    if (!alt.disponible) continue;
    if (await lieuOccupe(alt._id.toString(), debut, fin, seance._id.toString())) continue;
    let resume: ResumePrevision | null = null;
    if (alt.exterieur) {
      if (alt.latitude == null || alt.longitude == null) continue;
      try {
        const prev = await fetchPrevisions(alt.latitude, alt.longitude);
        resume = resumerFenetre(prev, debut.getTime(), fin.getTime());
      } catch (error) {
        if (!(error instanceof MeteoUnavailableError)) console.error(error);
        continue;
      }
      if (!resume || evaluer(resume, seuils).length > 0) continue;
    }
    lieuxAlternatifs.push({
      lieu: {
        id: alt._id.toString(),
        nom: alt.nom,
        exterieur: alt.exterieur,
        disponible: alt.disponible,
        coutSupplementaire: alt.coutSupplementaire ?? 0,
      },
      resume,
    });
  }

  // 2. Postponement: same time of day, next days with good weather, free team, free location
  const reports: PropositionsMeteoDTO["reports"] = [];
  let previsionsIndisponibles = false;
  if (lieu.latitude != null && lieu.longitude != null) {
    try {
      const prev = await fetchPrevisions(lieu.latitude, lieu.longitude);
      const candidats = candidatsReport({
        prev,
        seuils,
        debut: debut.getTime(),
        fin: fin.getTime(),
        maintenant: Date.now(),
        max: 8,
      });
      for (const c of candidats) {
        if (reports.length === 3) break;
        const d = new Date(c.debut);
        const f = new Date(c.fin);
        if (!(await creneauEquipeLibre(seance._id.toString(), d, f))) continue;
        if (await lieuOccupe(lieu._id.toString(), d, f, seance._id.toString())) continue;
        reports.push({ dateDebut: d.toISOString(), dateFin: f.toISOString(), resume: c.resume });
      }
    } catch (error) {
      if (!(error instanceof MeteoUnavailableError)) console.error(error);
      previsionsIndisponibles = true;
    }
  } else {
    previsionsIndisponibles = true;
  }
  return { alerte, seance, lieu, propositions: { lieuxAlternatifs, reports, previsionsIndisponibles } };
}

export async function proposerOptions(alerteId: string): Promise<PropositionsMeteoDTO> {
  return (await calculerPropositions(alerteId)).propositions;
}

// ── Admin decisions ─────────────────────────────────────────────────────────

async function notifierClient(clientId: string | undefined, titre: string, message: string) {
  if (!clientId) return;
  await createNotification({
    utilisateurId: clientId,
    type: "SEANCE",
    titre,
    message: message.slice(0, 500),
    lienCible: "/espace-client/seances",
  }).catch((error: unknown) => console.error(error));
}

async function cloturer(
  alerteId: string,
  statut: "TRAITEE" | "IGNOREE",
  type: TypeDecisionMeteo,
  actorId: string,
  detail: string,
) {
  await AlerteMeteo.updateOne(
    { _id: alerteId, statut: "OUVERTE" },
    {
      $set: {
        statut,
        decision: { type, par: new Types.ObjectId(actorId), le: new Date(), detail: detail.slice(0, 300) },
      },
    },
  );
}

export async function appliquerReport(alerteId: string, dateDebutIso: string, actorId: string): Promise<void> {
  const { seance, lieu, propositions } = await calculerPropositions(alerteId);
  const choisie = propositions.reports.find((r) => Date.parse(r.dateDebut) === Date.parse(dateDebutIso));
  if (!choisie) {
    throw new ServiceError("This date is no longer proposed (forecast or schedule changed). Reopen the options.");
  }
  const ancienne = seance.dateDebut;
  const moved = await replanifierSeance(seance._id.toString(), {
    dateDebut: new Date(choisie.dateDebut),
    dateFin: new Date(choisie.dateFin),
  });
  await cloturer(
    alerteId,
    "TRAITEE",
    "REPORT",
    actorId,
    `Postponed from ${formatDateTime(ancienne)} to ${formatDateTime(moved.dateDebut)} (weather).`,
  );
  await notifierClient(
    moved.clientId,
    "Your session has been rescheduled",
    `Because of the weather forecast, “${moved.titre}” at ${lieu.nom} moves from ${formatDateTime(ancienne)} to ${formatDateTime(moved.dateDebut)}. Contact the studio if this does not suit you.`,
  );
}

export async function appliquerLieuAlternatif(alerteId: string, lieuId: string, actorId: string): Promise<void> {
  const { seance, lieu, propositions } = await calculerPropositions(alerteId);
  const choisi = propositions.lieuxAlternatifs.find((o) => o.lieu.id === lieuId);
  if (!choisi) {
    throw new ServiceError("This location is no longer proposed (availability or weather changed). Reopen the options.");
  }
  const moved = await replanifierSeance(seance._id.toString(), { lieuId });
  const cout = choisi.lieu.coutSupplementaire;
  await cloturer(
    alerteId,
    "TRAITEE",
    "LIEU_ALTERNATIF",
    actorId,
    `Moved from ${lieu.nom} to ${choisi.lieu.nom} (weather).${cout > 0 ? ` Extra cost to bill: ${cout} TND.` : ""}`,
  );
  await notifierClient(
    moved.clientId,
    "Your session location has changed",
    `Because of the weather forecast, “${moved.titre}” on ${formatDateTime(moved.dateDebut)} moves from ${lieu.nom} to ${choisi.lieu.nom}. Contact the studio if this does not suit you.`,
  );
}

export async function maintenirSeance(alerteId: string, actorId: string): Promise<void> {
  await chargerAlerteOuverte(alerteId);
  await cloturer(alerteId, "IGNOREE", "MAINTENU", actorId, "Session kept as planned despite the forecast.");
}
