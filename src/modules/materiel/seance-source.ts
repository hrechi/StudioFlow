/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 *
 * SEUL point d'accès du module Matériel aux séances : il passe par le service du module
 * Séances (listSeances / findSeanceById), jamais par sa collection.
 *
 * Mapping SeanceDTO (modules/seances/seance.dto.ts) → SeanceReservableDTO :
 * - id, titre, lieu, dateDebut, dateFin → mêmes champs (ISO, UTC) ;
 * - typeEvenement                      → `typeEvenement.nom` (texte recopié dans chaque
 *                                         réservation : l'historique du kit IA s'appuie dessus) ;
 * - clientNom                          → `nomClient(seance)` : prénom + nom du client, ou
 *                                         `clientExterne.nom`.
 * Les réservations gardent l'id de séance dans `reservations_materiel.seance` (ObjectId sans ref).
 */
import "server-only";
import {
  nomClient,
  STATUTS_BLOQUANTS,
  type SeanceDTO,
  type StatutSeanceReel,
} from "@/modules/seances/seance.dto";
import { findSeanceById, listSeances } from "@/modules/seances/seance.service";

/** What the Equipment module needs to know about a séance. */
export type SeanceReservableDTO = {
  id: string;
  titre: string;
  typeEvenement: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  clientNom: string;
};

export interface SeanceSource {
  /** Séances equipment can still be reserved for, by start date. */
  listSeancesReservables(): Promise<SeanceReservableDTO[]>;
  /** One reservable séance, or null if it does not exist or can no longer be reserved for. */
  getSeanceReservable(id: string): Promise<SeanceReservableDTO | null>;
}

/**
 * Equipment is prepared only for séances the studio has committed to and that have a fixed
 * slot: the Séances module's own STATUTS_BLOQUANTS (EN_ATTENTE_CONFIRMATION, CONFIRMEE,
 * EN_COURS), the statuses that already hold the team's time. Left out: DEMANDE_RECUE (a client
 * request not reviewed yet), REPORTEE (no valid date until it is rescheduled), TERMINEE and
 * ANNULEE (closed).
 */
const STATUTS_RESERVABLES: readonly StatutSeanceReel[] = STATUTS_BLOQUANTS;

function estReservable(seance: SeanceDTO, now = Date.now()): boolean {
  return STATUTS_RESERVABLES.includes(seance.statut) && new Date(seance.dateFin).getTime() > now;
}

function toDTO(seance: SeanceDTO): SeanceReservableDTO {
  return {
    id: seance.id,
    titre: seance.titre,
    typeEvenement: seance.typeEvenement.nom,
    lieu: seance.lieu,
    dateDebut: seance.dateDebut,
    dateFin: seance.dateFin,
    clientNom: nomClient(seance),
  };
}

const seancesSource: SeanceSource = {
  async listSeancesReservables() {
    const seances = await listSeances();
    return seances
      .filter((s) => estReservable(s))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
      .map(toDTO);
  },
  async getSeanceReservable(id) {
    const seance = await findSeanceById(id);
    return seance && estReservable(seance) ? toDTO(seance) : null;
  },
};

const source: SeanceSource = seancesSource;

export const listSeancesReservables = () => source.listSeancesReservables();
export const getSeanceReservable = (id: string) => source.getSeanceReservable(id);
