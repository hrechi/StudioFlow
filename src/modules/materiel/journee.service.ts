/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * "My day": today's sessions with the equipment to take, overdue returns and today's tasks.
 *
 * Séances and tasks are read ONLY through the Séances service (listSeances, findSeanceById,
 * listTaches), never through their collections. Reservations come from this module's service.
 */
import "server-only";
import { nomClient, roleEquipeLabels, type SeanceDTO } from "@/modules/seances/seance.dto";
import { findSeanceById, listSeances } from "@/modules/seances/seance.service";
import { listTaches } from "@/modules/seances/tache.service";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import type { UtilisateurDTO } from "@/modules/utilisateurs/utilisateur.types";
import {
  bornesJour,
  chevaucheJour,
  lienItineraire,
  nettoyerNotes,
  type JourneeDTO,
  type PorteeJournee,
  type ReservationJourDTO,
  type SeanceJourDTO,
  type TacheJourDTO,
} from "./journee.types";
import type { Reservation } from "./materiel.types";
import { listReservations } from "./reservation-materiel.service";

type Actor = Pick<UtilisateurDTO, "id" | "role">;

/** Sessions that are not happening today even if their dates say so. */
const STATUTS_HORS_JOURNEE = new Set(["ANNULEE", "REPORTEE"]);

function versReservation(r: Reservation, actor: Actor, maintenant: Date): ReservationJourDTO {
  return {
    id: r.id,
    statut: r.statut,
    dateDebut: r.dateDebut,
    dateFin: r.dateFin,
    materiel: r.materiel,
    seanceId: r.seance.id,
    seanceTitre: r.seance.titre,
    reservePar: r.utilisateur ? `${r.utilisateur.prenom} ${r.utilisateur.nom}`.trim() : null,
    peutAgir: actor.role === "ADMIN" || r.utilisateur?.id === actor.id,
    enRetard: r.statut === "EN_COURS" && new Date(r.dateFin).getTime() <= maintenant.getTime(),
  };
}

type ContactClient = { telephone?: string; email?: string };

/** External clients carry their contact on the session; account clients through the Utilisateurs service. */
async function contactClient(s: SeanceDTO): Promise<ContactClient> {
  if (s.clientExterne) return { telephone: s.clientExterne.telephone || undefined, email: s.clientExterne.email || undefined };
  if (!s.client) return {};
  const compte = await findUtilisateurById(s.client.id).catch(() => null);
  return { telephone: compte?.telephone || undefined, email: compte?.email || undefined };
}

function versSeance(s: SeanceDTO, actor: Actor, reservations: ReservationJourDTO[], taches: TacheJourDTO[], contact: ContactClient): SeanceJourDTO {
  return {
    id: s.id,
    titre: s.titre,
    typeEvenement: s.typeEvenement.nom,
    lieu: s.lieu,
    itineraire: lienItineraire(s.lieu),
    dateDebut: s.dateDebut,
    dateFin: s.dateFin,
    statut: s.statut,
    clientNom: nomClient(s),
    clientTelephone: contact.telephone,
    clientEmail: contact.email,
    prestation: s.pack?.nom ?? (s.prestationPersonnalisee?.trim() || undefined),
    notes: nettoyerNotes(s.notes),
    messageClient: s.messageClient?.trim() || undefined,
    equipe: s.equipe.map((m) => ({ nom: `${m.employe.prenom} ${m.employe.nom}`.trim(), role: roleEquipeLabels[m.role], moi: m.employe.id === actor.id })),
    reservations: reservations.sort((a, b) => a.materiel.nom.localeCompare(b.materiel.nom)),
    taches,
  };
}

/**
 * A PHOTOGRAPHE sees their own assignments: the sessions they are on, and the equipment they
 * booked. An ADMIN sees the same with "Me", and the whole studio with "Everyone".
 */
export async function getMaJournee(actor: Actor, portee: PorteeJournee = "moi", maintenant = new Date()): Promise<JourneeDTO> {
  const tout = actor.role === "ADMIN" && portee === "tous";
  const jour = bornesJour(maintenant);

  const [mesSeances, reservationsDuJour, enCours, taches] = await Promise.all([
    listSeances(tout ? {} : { employeId: actor.id }),
    listReservations({ du: jour.debut, au: jour.fin }),
    listReservations({ statut: "EN_COURS" }),
    listTaches({ employeId: actor.id }),
  ]);
  const idsMesSeances = new Set(mesSeances.map((s) => s.id));
  const concerne = (r: Reservation) => tout || r.utilisateur?.id === actor.id || idsMesSeances.has(r.seance.id);

  const reservations = reservationsDuJour.filter((r) => r.statut !== "ANNULEE" && concerne(r));
  const seancesDuJour = new Map(
    mesSeances.filter((s) => !STATUTS_HORS_JOURNEE.has(s.statut) && chevaucheJour(s, jour)).map((s) => [s.id, s]),
  );
  // Equipment the user booked for a session they are not on: the session is still shown.
  const manquantes = [...new Set(reservations.map((r) => r.seance.id).filter((id) => !seancesDuJour.has(id)))];
  for (const seance of await Promise.all(manquantes.map((id) => findSeanceById(id)))) {
    if (seance && !STATUTS_HORS_JOURNEE.has(seance.statut)) seancesDuJour.set(seance.id, seance);
  }

  const tachesDuJour: TacheJourDTO[] = taches
    .filter((t) => t.dateLimite && chevaucheJour({ dateDebut: t.dateLimite, dateFin: new Date(new Date(t.dateLimite).getTime() + 1) }, jour))
    .map((t) => ({
      id: t.id,
      titre: t.titre,
      seanceId: t.seance.id,
      seanceTitre: t.seance.titre,
      phase: t.phase,
      priorite: t.priorite,
      statut: t.statut,
      dateLimite: t.dateLimite,
      enRetard: t.enRetard,
    }));

  const parSeance = new Map<string, ReservationJourDTO[]>();
  for (const r of reservations) {
    parSeance.set(r.seance.id, [...(parSeance.get(r.seance.id) ?? []), versReservation(r, actor, maintenant)]);
  }
  const triees = [...seancesDuJour.values()].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  const contacts = await Promise.all(triees.map(contactClient));
  const seances = triees.map((s, i) => versSeance(s, actor, parSeance.get(s.id) ?? [], tachesDuJour.filter((t) => t.seanceId === s.id), contacts[i]));
  const tachesLibres = tachesDuJour.filter((t) => !seancesDuJour.has(t.seanceId));

  // Late equipment of a session shown today is flagged in that session, not listed twice.
  const dejaAffichees = new Set(seances.flatMap((s) => s.reservations.map((r) => r.id)));
  const retards = enCours
    .filter((r) => new Date(r.dateFin).getTime() <= maintenant.getTime() && concerne(r) && !dejaAffichees.has(r.id))
    .sort((a, b) => a.dateFin.localeCompare(b.dateFin))
    .map((r) => versReservation(r, actor, maintenant));

  return {
    date: jour.date,
    genereLe: maintenant.toISOString(),
    utilisateurId: actor.id,
    portee: tout ? "tous" : "moi",
    seances,
    retards,
    taches: tachesLibres,
    resume: {
      seances: seances.length,
      equipements: seances.reduce((n, s) => n + s.reservations.length, 0),
      taches: tachesDuJour.length,
    },
  };
}
