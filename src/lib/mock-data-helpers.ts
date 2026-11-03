/**
 * Helpers shared by the template modules' mock-data.ts files.
 * Delete a module's usage once it reads real data from its service.
 */
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { MOCK_AVATARS } from "./mock-images";

/** ISO date `days` from today at `hour:minute` (local time) — keeps mock data "current". */
export function inDays(days: number, hour = 10, minute = 0): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** Staff and clients referenced by the mock séances, galeries, factures, avis… */
export const MOCK_PHOTOGRAPHES: UtilisateurRef[] = [
  { id: "u-photo-1", prenom: "Yassine", nom: "Gharbi", photoProfil: MOCK_AVATARS[1] },
  { id: "u-photo-2", prenom: "Ines", nom: "Trabelsi", photoProfil: MOCK_AVATARS[2] },
  { id: "u-photo-3", prenom: "Mehdi", nom: "Ben Salah", photoProfil: MOCK_AVATARS[3] },
  { id: "u-photo-4", prenom: "Karim", nom: "Mansour", photoProfil: MOCK_AVATARS[10] },
];

export const MOCK_CLIENTS: UtilisateurRef[] = [
  { id: "u-client-1", prenom: "Sarra", nom: "Ben Ali", photoProfil: MOCK_AVATARS[0] },
  { id: "u-client-2", prenom: "Omar", nom: "Haddad", photoProfil: MOCK_AVATARS[5] },
  { id: "u-client-3", prenom: "Leïla", nom: "Chaabane", photoProfil: MOCK_AVATARS[4] },
  { id: "u-client-4", prenom: "Maison", nom: "Jasmin", photoProfil: undefined },
  { id: "u-client-5", prenom: "Nour", nom: "Essid", photoProfil: MOCK_AVATARS[11] },
  { id: "u-client-6", prenom: "Atelier", nom: "Médina", photoProfil: undefined },
];

/** The client shown in the client-area templates (front office). */
export const MOCK_CURRENT_CLIENT = MOCK_CLIENTS[0];

export function fullName(ref: Pick<UtilisateurRef, "prenom" | "nom">): string {
  return `${ref.prenom} ${ref.nom}`;
}
