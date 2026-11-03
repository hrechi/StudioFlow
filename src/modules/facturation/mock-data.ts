/**
 * Module : Gestion de la Facturation · Responsable : Aya Flah
 * MOCK DATA — replace with devis.service.ts (Devis + embedded Factures).
 */
import { MOCK_CLIENTS, MOCK_CURRENT_CLIENT, inDays } from "@/lib/mock-data-helpers";
import {
  calculerTotaux,
  TVA_PAR_DEFAUT,
  type Devis,
  type Facture,
  type LignePrestation,
} from "./facturation.types";

const [sarra, omar, leila, jasmin, nour, medina] = MOCK_CLIENTS;

function devis(base: Omit<Devis, "montantHT" | "montantTTC" | "tva"> & { tva?: number }): Devis {
  const tva = base.tva ?? TVA_PAR_DEFAUT;
  const { montantHT, montantTTC } = calculerTotaux(base.prestations, base.remise, tva);
  return { ...base, tva, montantHT: Math.round(montantHT), montantTTC: Math.round(montantTTC) };
}

const MARIAGE: LignePrestation[] = [
  { designation: "Wedding coverage (ceremony + party, 9 h)", quantite: 1, prixUnitaire: 2200 },
  { designation: "Second photographer", quantite: 1, prixUnitaire: 450 },
  { designation: "Drone shots", quantite: 1, prixUnitaire: 250 },
  { designation: "Photo album 30×30, 40 pages", quantite: 1, prixUnitaire: 380 },
];

const facture = (f: Facture) => f;

export const DEVIS: Devis[] = [
  devis({
    id: "devis-1",
    numero: "DEV-2026-041",
    dateEmission: inDays(-20),
    dateValidite: inDays(10),
    prestations: MARIAGE,
    remise: 10,
    statut: "ACCEPTE",
    genereParIA: true,
    client: sarra,
    seance: { id: "seance-1", titre: "Sarra & Amine Wedding" },
    factures: [
      facture({
        id: "fac-1",
        numero: "FAC-2026-118",
        type: "ACOMPTE",
        dateEmission: inDays(-18),
        dateEcheance: inDays(-8),
        montantTTC: 1054,
        montantPaye: 1054,
        modePaiement: "VIREMENT",
        statut: "PAYEE",
        datePaiement: inDays(-10),
      }),
      facture({
        id: "fac-2",
        numero: "FAC-2026-131",
        type: "SOLDE",
        dateEmission: inDays(-1),
        dateEcheance: inDays(14),
        montantTTC: 2459,
        montantPaye: 0,
        statut: "EN_ATTENTE",
        risqueRetardIA: 0.18,
      }),
    ],
  }),
  devis({
    id: "devis-2",
    numero: "DEV-2026-044",
    dateEmission: inDays(-6),
    dateValidite: inDays(24),
    prestations: [
      { designation: "Product packshot, white background", quantite: 42, prixUnitaire: 35 },
      { designation: "Lifestyle styled scenes", quantite: 8, prixUnitaire: 90 },
      { designation: "Advanced retouching", quantite: 50, prixUnitaire: 12 },
    ],
    remise: 5,
    statut: "ENVOYE",
    genereParIA: false,
    client: jasmin,
    seance: { id: "seance-3", titre: "Autumn collection — Maison Jasmin" },
    factures: [],
  }),
  devis({
    id: "devis-3",
    numero: "DEV-2026-038",
    dateEmission: inDays(-30),
    dateValidite: inDays(-5),
    prestations: [
      { designation: "Corporate portraits (12 people)", quantite: 12, prixUnitaire: 80 },
      { designation: "Beauty retouching", quantite: 12, prixUnitaire: 20 },
    ],
    remise: 0,
    statut: "ACCEPTE",
    genereParIA: false,
    client: medina,
    seance: { id: "seance-2", titre: "Corporate portraits — Atelier Médina" },
    factures: [
      facture({
        id: "fac-3",
        numero: "FAC-2026-102",
        type: "ACOMPTE",
        dateEmission: inDays(-28),
        dateEcheance: inDays(-14),
        montantTTC: 428,
        montantPaye: 200,
        modePaiement: "CHEQUE",
        statut: "EN_RETARD",
        risqueRetardIA: 0.82,
      }),
    ],
  }),
  devis({
    id: "devis-4",
    numero: "DEV-2026-045",
    dateEmission: inDays(-2),
    dateValidite: inDays(28),
    prestations: [
      { designation: "Event coverage (4 h)", quantite: 1, prixUnitaire: 900 },
      { designation: "Photo booth with prints", quantite: 1, prixUnitaire: 350 },
    ],
    remise: 0,
    statut: "BROUILLON",
    genereParIA: true,
    client: nour,
    seance: { id: "seance-4", titre: "Nour Cosmetics launch party" },
    factures: [],
  }),
  devis({
    id: "devis-5",
    numero: "DEV-2026-029",
    dateEmission: inDays(-45),
    dateValidite: inDays(-15),
    prestations: [
      {
        designation: "Family session (1.5 h) + 15 retouched photos",
        quantite: 1,
        prixUnitaire: 320,
      },
    ],
    remise: 0,
    statut: "REFUSE",
    genereParIA: false,
    client: omar,
    seance: { id: "seance-5", titre: "Haddad family portrait" },
    factures: [],
  }),
  devis({
    id: "devis-6",
    numero: "DEV-2026-022",
    dateEmission: inDays(-60),
    dateValidite: inDays(-30),
    prestations: [
      { designation: "Maternity session (2 h)", quantite: 1, prixUnitaire: 380 },
      { designation: "Fine art prints 30×40", quantite: 3, prixUnitaire: 60 },
    ],
    remise: 0,
    statut: "ACCEPTE",
    genereParIA: false,
    client: sarra,
    seance: { id: "seance-8", titre: "Sarra maternity session" },
    factures: [
      facture({
        id: "fac-4",
        numero: "FAC-2026-077",
        type: "SOLDE",
        dateEmission: inDays(-20),
        dateEcheance: inDays(-5),
        montantTTC: 666,
        montantPaye: 666,
        modePaiement: "CARTE",
        statut: "PAYEE",
        datePaiement: inDays(-12),
      }),
    ],
  }),
  devis({
    id: "devis-7",
    numero: "DEV-2026-033",
    dateEmission: inDays(-35),
    dateValidite: inDays(-5),
    prestations: [
      { designation: "Engagement session (3 h), outdoors", quantite: 1, prixUnitaire: 700 },
    ],
    remise: 0,
    statut: "ACCEPTE",
    genereParIA: false,
    client: leila,
    seance: { id: "seance-6", titre: "Leïla & Sami engagement" },
    factures: [
      facture({
        id: "fac-5",
        numero: "FAC-2026-109",
        type: "ACOMPTE",
        dateEmission: inDays(-30),
        dateEcheance: inDays(-20),
        montantTTC: 250,
        montantPaye: 250,
        modePaiement: "ESPECES",
        statut: "PAYEE",
        datePaiement: inDays(-25),
      }),
      facture({
        id: "fac-6",
        numero: "FAC-2026-127",
        type: "SOLDE",
        dateEmission: inDays(-3),
        dateEcheance: inDays(4),
        montantTTC: 583,
        montantPaye: 300,
        modePaiement: "VIREMENT",
        statut: "PARTIELLEMENT_PAYEE",
        risqueRetardIA: 0.46,
      }),
    ],
  }),
];

DEVIS.push(
  devis({
    id: "devis-8",
    numero: "DEV-2026-046",
    dateEmission: inDays(-1),
    dateValidite: inDays(29),
    prestations: [
      { designation: "Premium wedding album 35×35, 60 pages", quantite: 1, prixUnitaire: 690 },
      { designation: "Parents' mini albums", quantite: 2, prixUnitaire: 140 },
    ],
    remise: 0,
    statut: "ENVOYE",
    genereParIA: true,
    client: sarra,
    seance: { id: "seance-1", titre: "Sarra & Amine Wedding" },
    factures: [],
  }),
);

/** Lines the "Generate with AI" button proposes (from séance type + past pricing). */
export const LIGNES_IA: LignePrestation[] = [
  { designation: "Studio portrait coverage (2 h)", quantite: 1, prixUnitaire: 420 },
  { designation: "Beauty retouching", quantite: 15, prixUnitaire: 18 },
  { designation: "Private online gallery (3 months)", quantite: 1, prixUnitaire: 0 },
];

export type FactureAvecContexte = Facture & {
  devis: Pick<Devis, "id" | "numero" | "client" | "seance">;
};

export const FACTURES: FactureAvecContexte[] = DEVIS.flatMap((d) =>
  d.factures.map((f) => ({
    ...f,
    devis: { id: d.id, numero: d.numero, client: d.client, seance: d.seance },
  })),
).sort((a, b) => b.dateEmission.localeCompare(a.dateEmission));

/** Quotes and invoices of the client shown in the client-area templates. */
export const MES_DEVIS = DEVIS.filter(
  (d) => d.client.id === MOCK_CURRENT_CLIENT.id && d.statut !== "BROUILLON",
);
export const MES_FACTURES = FACTURES.filter((f) => f.devis.client.id === MOCK_CURRENT_CLIENT.id);
