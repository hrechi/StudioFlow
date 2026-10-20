/**
 * Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi
 * MOCK DATA — replace with avis.service.ts / reclamation.service.ts.
 */
import {
  MOCK_CLIENTS,
  MOCK_CURRENT_CLIENT,
  MOCK_PHOTOGRAPHES,
  inDays,
} from "@/lib/mock-data-helpers";
import type { Avis, Reclamation } from "./avis.types";

const [sarra, omar, leila, jasmin, nour, medina] = MOCK_CLIENTS;

export const AVIS: Avis[] = [
  {
    id: "avis-1",
    note: 5,
    commentaire:
      "Lovely people and stunning photos. Yassine captured every emotion of our engagement, we cried when we opened the gallery!",
    dateAvis: inDays(-1),
    sentimentIA: "POSITIF",
    scoreSentimentIA: 0.97,
    estPublie: false,
    client: leila,
    seance: { id: "seance-6", titre: "Leïla & Sami engagement", type: "Wedding" },
  },
  {
    id: "avis-2",
    note: 5,
    commentaire:
      "Flawless packshots, delivered early. The white background is perfect for our online shop.",
    dateAvis: inDays(-6),
    sentimentIA: "POSITIF",
    scoreSentimentIA: 0.92,
    estPublie: true,
    reponseStudio: "Thank you so much! It was a pleasure to work on your creations.",
    client: medina,
    seance: { id: "seance-7", titre: "Watch shoot — Atelier Médina", type: "Product" },
  },
  {
    id: "avis-3",
    note: 4,
    commentaire:
      "A beautiful maternity session with a gentle atmosphere. The gallery took a while to arrive, but the result was worth it.",
    dateAvis: inDays(-15),
    sentimentIA: "POSITIF",
    scoreSentimentIA: 0.71,
    estPublie: true,
    reponseStudio: "Thank you Sarra, and congratulations again!",
    client: sarra,
    seance: { id: "seance-8", titre: "Sarra maternity session", type: "Portrait" },
  },
  {
    id: "avis-4",
    note: 3,
    commentaire: "Decent photos, but the session started 30 minutes late.",
    dateAvis: inDays(-20),
    sentimentIA: "NEUTRE",
    scoreSentimentIA: 0.52,
    estPublie: false,
    client: omar,
    seance: { id: "seance-x5", titre: "Haddad family portrait (2025)", type: "Portrait" },
  },
  {
    id: "avis-5",
    note: 2,
    commentaire:
      "Disappointed by the retouching of some group photos, the colors are too saturated.",
    dateAvis: inDays(-28),
    sentimentIA: "NEGATIF",
    scoreSentimentIA: 0.83,
    estPublie: false,
    client: nour,
    seance: { id: "seance-x3", titre: "Nour Cosmetics party 2025", type: "Event" },
  },
  {
    id: "avis-6",
    note: 5,
    commentaire: "The best wedding studio in Tunis. A stunning album, true artistry.",
    dateAvis: inDays(-40),
    sentimentIA: "POSITIF",
    scoreSentimentIA: 0.98,
    estPublie: true,
    reponseStudio: "Thank you so much for your trust!",
    client: { id: "u-client-7", prenom: "Ons", nom: "Ayari" },
    seance: { id: "seance-x1", titre: "Ons & Walid Wedding", type: "Wedding" },
  },
  {
    id: "avis-7",
    note: 5,
    commentaire:
      "Great corporate portraits, everyone at the office loved them. Perfectly organized.",
    dateAvis: inDays(-50),
    sentimentIA: "POSITIF",
    scoreSentimentIA: 0.9,
    estPublie: true,
    client: jasmin,
    seance: { id: "seance-x2", titre: "Corporate portraits — Maison Jasmin", type: "Portrait" },
  },
];

export const RECLAMATIONS: Reclamation[] = [
  {
    id: "rec-1",
    objet: "Gallery still not received",
    description:
      "The session was 3 weeks ago and I still haven't received my gallery link. Could you give me a date?",
    categorie: "AUTRE",
    categorieIA: "RETARD",
    priorite: "HAUTE",
    statut: "OUVERTE",
    dateCreation: inDays(0, 9, 12),
    client: omar,
    seance: { id: "seance-x5", titre: "Haddad family portrait (2025)" },
  },
  {
    id: "rec-2",
    objet: "Balance invoice amount",
    description: "The balance invoice doesn't include the 10% discount agreed in the quote.",
    categorie: "FACTURATION",
    categorieIA: "FACTURATION",
    priorite: "URGENTE",
    statut: "EN_COURS",
    dateCreation: inDays(-1, 16, 40),
    client: medina,
    seance: { id: "seance-2", titre: "Corporate portraits — Atelier Médina" },
    traitePar: { id: "u-admin", prenom: "Admin", nom: "StudioFlow" },
  },
  {
    id: "rec-3",
    objet: "Colors too saturated",
    description:
      "On several group photos the skin tones look orange. Could the retouching be redone?",
    categorie: "QUALITE",
    categorieIA: "QUALITE",
    priorite: "MOYENNE",
    statut: "EN_COURS",
    dateCreation: inDays(-4),
    client: nour,
    seance: { id: "seance-x3", titre: "Nour Cosmetics party 2025" },
    traitePar: MOCK_PHOTOGRAPHES[3],
  },
  {
    id: "rec-4",
    objet: "Photographer arrived late",
    description: "The photographer arrived 30 minutes late and we lost the morning light.",
    categorie: "RETARD",
    categorieIA: "RETARD",
    priorite: "MOYENNE",
    statut: "RESOLUE",
    reponse: "We're sorry: a free 30-minute session has been offered to make up for it.",
    dateCreation: inDays(-19),
    dateResolution: inDays(-16),
    client: omar,
    seance: { id: "seance-x5", titre: "Haddad family portrait (2025)" },
    traitePar: MOCK_PHOTOGRAPHES[1],
  },
  {
    id: "rec-5",
    objet: "Request for extra prints",
    description: "I'd like to order 5 more prints, is that possible?",
    categorie: "AUTRE",
    categorieIA: "AUTRE",
    priorite: "BASSE",
    statut: "REJETEE",
    reponse: "This isn't a complaint: we've sent you a quote for the prints.",
    dateCreation: inDays(-25),
    dateResolution: inDays(-24),
    client: sarra,
    seance: { id: "seance-8", titre: "Sarra maternity session" },
  },
  {
    id: "rec-6",
    objet: "Blurry photo in my selection",
    description: "One of the photos in my selection is slightly blurry, can it be replaced?",
    categorie: "QUALITE",
    categorieIA: "QUALITE",
    priorite: "BASSE",
    statut: "OUVERTE",
    dateCreation: inDays(-2),
    client: sarra,
    seance: { id: "seance-8", titre: "Sarra maternity session" },
  },
];

/** Reviews shown on the public landing page. */
export const AVIS_PUBLIES = AVIS.filter((a) => a.estPublie);

/** Client-area data. */
export const MES_AVIS = AVIS.filter((a) => a.client.id === MOCK_CURRENT_CLIENT.id);
export const MES_RECLAMATIONS = RECLAMATIONS.filter((r) => r.client.id === MOCK_CURRENT_CLIENT.id);
/** Completed séances the client can still rate. */
export const SEANCES_A_NOTER = [
  { id: "seance-6b", titre: "Newborn photo session (Studio A)" },
  { id: "seance-8", titre: "Sarra maternity session" },
];
