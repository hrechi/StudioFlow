/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * MOCK DATA — replace with seance.service.ts (Mongoose) when the module is implemented.
 */
import {
  MOCK_CLIENTS,
  MOCK_CURRENT_CLIENT,
  MOCK_PHOTOGRAPHES,
  inDays,
} from "@/lib/mock-data-helpers";
import { mockImage } from "@/lib/mock-images";
import type { CreneauSuggere, Lieu, Seance } from "./seance.types";

const [yassine, ines, mehdi] = MOCK_PHOTOGRAPHES;
const [sarra, omar, leila, jasmin, nour, medina] = MOCK_CLIENTS;

export const LIEUX: Lieu[] = [
  {
    id: "lieu-1",
    nom: "Studio A — Daylight",
    type: "STUDIO",
    adresse: "Les Berges du Lac, Tunis",
    capacite: 8,
    description: "Large glass roof, infinite white backdrop, ideal for portraits and families.",
    disponible: true,
    photo: mockImage("studio", 0),
  },
  {
    id: "lieu-2",
    nom: "Studio B — Packshot",
    type: "STUDIO",
    adresse: "Les Berges du Lac, Tunis",
    capacite: 4,
    description: "Shooting table, light boxes, cyclorama backdrop.",
    disponible: true,
    photo: mockImage("studio", 4),
  },
  {
    id: "lieu-3",
    nom: "Carthage Gardens",
    type: "EXTERIEUR",
    adresse: "Carthage Byrsa",
    capacite: 150,
    description: "Gardens and olive trees, golden light at the end of the day.",
    disponible: true,
    photo: mockImage("mariage", 4),
  },
  {
    id: "lieu-4",
    nom: "Sidi Bou Saïd medina",
    type: "EXTERIEUR",
    adresse: "Sidi Bou Saïd",
    capacite: 20,
    description: "Blue and white alleys, permit required.",
    disponible: false,
    photo: mockImage("portrait", 6),
  },
  {
    id: "lieu-5",
    nom: "At the client's place",
    type: "DOMICILE_CLIENT",
    adresse: "Address given when booking",
    capacite: 0,
    description: "The crew and equipment travel to the client's home or company.",
    disponible: true,
    photo: mockImage("evenement", 5),
  },
];

const ref = (lieu: Lieu) => ({ id: lieu.id, nom: lieu.nom, type: lieu.type });

export const SEANCES: Seance[] = [
  {
    id: "seance-1",
    titre: "Sarra & Amine Wedding",
    type: "MARIAGE",
    dateDebut: inDays(2, 14),
    dateFin: inDays(2, 23),
    statut: "CONFIRMEE",
    notes: "Ceremony at 4 pm, cocktails at sunset. Bring the drone.",
    client: sarra,
    photographe: yassine,
    lieu: ref(LIEUX[2]),
    couverture: mockImage("mariage", 3),
  },
  {
    id: "seance-2",
    titre: "Corporate portraits — Atelier Médina",
    type: "PORTRAIT",
    dateDebut: inDays(1, 9, 30),
    dateFin: inDays(1, 12),
    statut: "CONFIRMEE",
    client: medina,
    photographe: ines,
    lieu: ref(LIEUX[0]),
    couverture: mockImage("portrait", 7),
  },
  {
    id: "seance-3",
    titre: "Autumn collection — Maison Jasmin",
    type: "PRODUIT",
    dateDebut: inDays(3, 10),
    dateFin: inDays(3, 16),
    statut: "PLANIFIEE",
    notes: "42 products, white background + styled scenes.",
    creneauSuggereIA: inDays(3, 10),
    client: jasmin,
    photographe: mehdi,
    lieu: ref(LIEUX[1]),
    couverture: mockImage("produit", 0),
  },
  {
    id: "seance-4",
    titre: "Nour Cosmetics launch party",
    type: "EVENEMENT",
    dateDebut: inDays(5, 19),
    dateFin: inDays(5, 23, 30),
    statut: "PLANIFIEE",
    client: nour,
    photographe: yassine,
    lieu: ref(LIEUX[4]),
    couverture: mockImage("evenement", 1),
  },
  {
    id: "seance-5",
    titre: "Haddad family portrait",
    type: "PORTRAIT",
    dateDebut: inDays(6, 11),
    dateFin: inDays(6, 12, 30),
    statut: "PLANIFIEE",
    client: omar,
    photographe: ines,
    lieu: ref(LIEUX[0]),
    couverture: mockImage("portrait", 2),
  },
  {
    id: "seance-6",
    titre: "Leïla & Sami engagement",
    type: "MARIAGE",
    dateDebut: inDays(-4, 17),
    dateFin: inDays(-4, 20),
    statut: "TERMINEE",
    client: leila,
    photographe: yassine,
    lieu: ref(LIEUX[3]),
    couverture: mockImage("mariage", 9),
  },
  {
    id: "seance-7",
    titre: "Watch shoot — Atelier Médina",
    type: "PRODUIT",
    dateDebut: inDays(-9, 9),
    dateFin: inDays(-9, 13),
    statut: "TERMINEE",
    client: medina,
    photographe: mehdi,
    lieu: ref(LIEUX[1]),
    couverture: mockImage("produit", 6),
  },
  {
    id: "seance-8",
    titre: "Sarra maternity session",
    type: "PORTRAIT",
    dateDebut: inDays(-20, 15),
    dateFin: inDays(-20, 16, 30),
    statut: "TERMINEE",
    client: sarra,
    photographe: ines,
    lieu: ref(LIEUX[0]),
    couverture: mockImage("portrait", 4),
  },
  {
    id: "seance-9",
    titre: "Tech Tunis conference",
    type: "EVENEMENT",
    dateDebut: inDays(-2, 8, 30),
    dateFin: inDays(-2, 18),
    statut: "ANNULEE",
    notes: "Cancelled by the client (postponed to December).",
    client: omar,
    photographe: mehdi,
    lieu: ref(LIEUX[4]),
    couverture: mockImage("evenement", 0),
  },
  {
    id: "seance-10",
    titre: "Nour's 30th birthday",
    type: "EVENEMENT",
    dateDebut: inDays(12, 20),
    dateFin: inDays(12, 23),
    statut: "PLANIFIEE",
    client: nour,
    photographe: ines,
    lieu: ref(LIEUX[4]),
    couverture: mockImage("evenement", 7),
  },
];

export const CRENEAUX_SUGGERES: CreneauSuggere[] = [
  {
    debut: inDays(4, 10),
    fin: inDays(4, 12),
    photographe: ines,
    lieu: { id: "lieu-1", nom: "Studio A — Daylight" },
    score: 0.92,
    raison: "Portrait specialist available, best daylight in the morning.",
  },
  {
    debut: inDays(7, 15),
    fin: inDays(7, 17),
    photographe: yassine,
    lieu: { id: "lieu-3", nom: "Carthage Gardens" },
    score: 0.81,
    raison: "Golden hour at 5 pm, no booking conflict.",
  },
  {
    debut: inDays(8, 9),
    fin: inDays(8, 11),
    photographe: mehdi,
    lieu: { id: "lieu-2", nom: "Studio B — Packshot" },
    score: 0.74,
    raison: "Studio free all morning.",
  },
];

/** Séances of the client shown in the client-area templates. */
export const MES_SEANCES = SEANCES.filter((s) => s.client.id === MOCK_CURRENT_CLIENT.id);

export function getSeance(id: string): Seance | undefined {
  return SEANCES.find((seance) => seance.id === id);
}
