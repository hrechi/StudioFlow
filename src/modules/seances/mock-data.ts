/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * MOCK DATA for the séance template pages — replaced in step 3 by seance.service.ts.
 */
import { MOCK_CLIENTS, MOCK_PHOTOGRAPHES, inDays } from "@/lib/mock-data-helpers";
import { mockImage } from "@/lib/mock-images";
import type { Lieu, Seance } from "./seance.types";

export const LIEUX: Lieu[] = [
  {
    id: "lieu-1",
    nom: "Studio ReFrame",
    adresse: "12 Rue de la Liberté, Tunis",
    description: "Main studio with cyclorama and natural light.",
    type: "STUDIO",
    capacite: 12,
    disponible: true,
    photo: mockImage("studio", 0),
  },
  {
    id: "lieu-2",
    nom: "Carthage seafront",
    adresse: "Carthage, Tunis",
    description: "Outdoor spot, best at golden hour.",
    type: "EXTERIEUR",
    capacite: 0,
    disponible: true,
    photo: mockImage("studio", 1),
  },
];

const base = { couverture: mockImage("studio", 2), photographe: MOCK_PHOTOGRAPHES[0] };

export const SEANCES: Seance[] = [
  {
    ...base,
    id: "s-1",
    titre: "Wedding — Sarra & Omar",
    type: "MARIAGE",
    statut: "CONFIRMEE",
    dateDebut: inDays(3, 14),
    dateFin: inDays(3, 20),
    lieu: LIEUX[1],
    client: MOCK_CLIENTS[0],
  },
  {
    ...base,
    id: "s-2",
    titre: "Portrait session",
    type: "PORTRAIT",
    statut: "PLANIFIEE",
    dateDebut: inDays(6, 10),
    dateFin: inDays(6, 12),
    lieu: LIEUX[0],
    client: MOCK_CLIENTS[2],
  },
];

export const MES_SEANCES: Seance[] = SEANCES.filter((s) => s.client.id === MOCK_CLIENTS[0].id);

/** Suggested slots for the (template) booking form. */
export const CRENEAUX_SUGGERES: string[] = [inDays(7, 10), inDays(8, 15), inDays(10, 11)];
