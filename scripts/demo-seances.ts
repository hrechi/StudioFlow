/**
 * Demo sessions shared by scripts/seed-demo.ts (real `seances` of the Séances module) and
 * scripts/seed-materiel.ts (`seances_demo`, stand-in of the Matériel module), so both
 * collections describe the same sessions. All dates are relative to today.
 *
 * One studio, one client (amel.mediouni@gmail.com, Amoulette); event types are the ones of
 * scripts/seed-facturation.ts.
 */
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Local date `days` from today at `hour:minute`. */
export function at(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export type TypeDemo = "Wedding" | "Engagement" | "Portrait" | "Corporate event";

export type StatutDemo =
  | "DEMANDE_RECUE"
  | "EN_ATTENTE_CONFIRMATION"
  | "CONFIRMEE"
  | "EN_COURS"
  | "TERMINEE"
  | "REPORTEE"
  | "ANNULEE";

export type SeanceDemoSeed = {
  key: string;
  titre: string;
  type: TypeDemo;
  lieu: string;
  debut: Date;
  heures: number;
  statut: StatutDemo;
};

const now = new Date();

export const DEMO_SEANCES: SeanceDemoSeed[] = [
  // Past
  {
    key: "p1",
    titre: "Wedding — Carthage ceremony",
    type: "Wedding",
    lieu: "Carthage",
    debut: at(-42, 14),
    heures: 9,
    statut: "TERMINEE",
  },
  {
    key: "p2",
    titre: "Engagement session at golden hour",
    type: "Engagement",
    lieu: "Sidi Bou Said",
    debut: at(-35, 16),
    heures: 3,
    statut: "TERMINEE",
  },
  {
    key: "p3",
    titre: "Head office team portraits",
    type: "Portrait",
    lieu: "Amoulette head office, Tunis",
    debut: at(-28, 10),
    heures: 4,
    statut: "TERMINEE",
  },
  {
    key: "p4",
    titre: "Annual gala",
    type: "Corporate event",
    lieu: "Gammarth",
    debut: at(-21, 18),
    heures: 5,
    statut: "TERMINEE",
  },
  {
    key: "p5",
    titre: "Founder portrait series",
    type: "Portrait",
    lieu: "ReFrame studio, Tunis",
    debut: at(-14, 10),
    heures: 3,
    statut: "TERMINEE",
  },
  {
    key: "p6",
    titre: "Wedding — Hammamet reception",
    type: "Wedding",
    lieu: "Hammamet",
    debut: at(-7, 15),
    heures: 9,
    statut: "TERMINEE",
  },
  {
    key: "p7",
    titre: "Store opening",
    type: "Corporate event",
    lieu: "Les Berges du Lac, Tunis",
    debut: at(-3, 17),
    heures: 4,
    statut: "TERMINEE",
  },
  // In progress (started two hours ago)
  {
    key: "c1",
    titre: "Executive portraits",
    type: "Portrait",
    lieu: "ReFrame studio, Tunis",
    debut: new Date(now.getTime() - 2 * HOUR),
    heures: 6,
    statut: "EN_COURS",
  },
  // Upcoming (next three weeks)
  {
    key: "u1",
    titre: "Engagement shoot — Sidi Bou Said",
    type: "Engagement",
    lieu: "Sidi Bou Said",
    debut: at(3, 16),
    heures: 3,
    statut: "CONFIRMEE",
  },
  // u2 and u3 overlap on the same day: use them to test conflicts.
  {
    key: "u2",
    titre: "Press conference",
    type: "Corporate event",
    lieu: "Hotel Laico, Tunis",
    debut: at(6, 10),
    heures: 4,
    statut: "CONFIRMEE",
  },
  {
    key: "u3",
    titre: "Board portraits",
    type: "Portrait",
    lieu: "Amoulette head office, Tunis",
    debut: at(6, 12),
    heures: 5,
    statut: "EN_ATTENTE_CONFIRMATION",
  },
  {
    key: "u4",
    titre: "Portrait session (cancelled)",
    type: "Portrait",
    lieu: "ReFrame studio, Tunis",
    debut: at(9, 10),
    heures: 3,
    statut: "ANNULEE",
  },
  {
    key: "u5",
    titre: "Wedding — Gammarth",
    type: "Wedding",
    lieu: "Gammarth",
    debut: at(12, 15),
    heures: 9,
    statut: "CONFIRMEE",
  },
  {
    key: "u6",
    titre: "Team building day",
    type: "Corporate event",
    lieu: "Hammamet",
    debut: at(18, 9),
    heures: 6,
    statut: "DEMANDE_RECUE",
  },
];

export const DEMO_CLIENT_EMAIL = "amel.mediouni@gmail.com";
export const DEMO_CLIENT_NOM = "Amel Mediouni (Amoulette)";
