/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * Pure reservation rules (no database): shared by the service, the UI and the seed.
 */
import type { StatutReservation } from "./materiel.types";

type Instant = Date | string | number;
export type Intervalle = { dateDebut: Instant; dateFin: Instant };

const ms = (value: Instant) =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * A starts before B ends AND B starts before A ends. Two reservations that only touch
 * (A ends exactly when B starts) do not overlap.
 */
export function seChevauchent(a: Intervalle, b: Intervalle): boolean {
  return ms(a.dateDebut) < ms(b.dateFin) && ms(b.dateDebut) < ms(a.dateFin);
}

/** A reservation in one of these statuses holds the equipment for its period. */
export const STATUTS_BLOQUANTS: readonly StatutReservation[] = [
  "EN_ATTENTE",
  "CONFIRMEE",
  "EN_COURS",
];

export function estBloquante(statut: StatutReservation): boolean {
  return STATUTS_BLOQUANTS.includes(statut);
}

/** EN_ATTENTE → CONFIRMEE → EN_COURS → RETOURNEE; ANNULEE from EN_ATTENTE or CONFIRMEE. */
export const TRANSITIONS_RESERVATION: Record<StatutReservation, readonly StatutReservation[]> = {
  EN_ATTENTE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["RETOURNEE"],
  RETOURNEE: [],
  ANNULEE: [],
};

export function peutPasser(de: StatutReservation, vers: StatutReservation): boolean {
  return TRANSITIONS_RESERVATION[de].includes(vers);
}
