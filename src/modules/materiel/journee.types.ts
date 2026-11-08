/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 * "My day": what the page, the API route, the app badge and the offline copy share. Pure (no
 * database, no browser), so the rules can be tested.
 */
import type { CategorieMateriel, StatutReservation } from "./materiel.types";

export type PorteeJournee = "moi" | "tous";

export type ReservationJourDTO = {
  id: string;
  statut: StatutReservation;
  dateDebut: string;
  dateFin: string;
  materiel: { id: string; nom: string; categorie: CategorieMateriel; numeroSerie: string };
  seanceId: string;
  seanceTitre: string;
  /** Who booked it, and whether the current user may confirm / return it (owner or ADMIN). */
  reservePar: string | null;
  peutAgir: boolean;
  /** Still out (EN_COURS) after its end date. */
  enRetard?: boolean;
};

export type SeanceJourDTO = {
  id: string;
  titre: string;
  typeEvenement: string;
  lieu: string;
  /** Google Maps directions to the venue, or null without a venue. */
  itineraire: string | null;
  dateDebut: string;
  dateFin: string;
  statut: string;
  clientNom: string;
  /** How to reach the client on the day (account or external contact), when known. */
  clientTelephone?: string;
  clientEmail?: string;
  /** What was sold: the pack, or the custom service. */
  prestation?: string;
  /** The studio's brief for the team, and what the client wrote when booking. */
  notes?: string;
  messageClient?: string;
  equipe: { nom: string; role: string; moi: boolean }[];
  reservations: ReservationJourDTO[];
  /** Today's tasks of the user for this session. */
  taches: TacheJourDTO[];
};

export type TacheJourDTO = {
  id: string;
  titre: string;
  seanceId: string;
  seanceTitre: string;
  phase: string;
  priorite: string;
  statut: string;
  dateLimite: string | null;
  enRetard: boolean;
};

export type JourneeDTO = {
  /** YYYY-MM-DD in the studio's time zone. */
  date: string;
  genereLe: string;
  utilisateurId: string;
  portee: PorteeJournee;
  seances: SeanceJourDTO[];
  /** Equipment still out (EN_COURS) after its end date. */
  retards: ReservationJourDTO[];
  /** Today's tasks of the user that belong to no session shown today (read through the Séances service). */
  taches: TacheJourDTO[];
  resume: { seances: number; equipements: number; taches: number };
};

/** The studio works in Tunis time (as the Séances module does): "today" is a Tunis day. */
export const FUSEAU_STUDIO = "Africa/Tunis";

/** Offset of a time zone at a given instant, in minutes (UTC+1 → 60). */
export function decalageMinutes(instant: Date, fuseau = FUSEAU_STUDIO): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: fuseau, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const mur = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((mur - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** Start (inclusive) and end (exclusive) of the studio's day containing `instant`. */
export function bornesJour(instant: Date, fuseau = FUSEAU_STUDIO): { date: string; debut: Date; fin: Date } {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: fuseau }).format(instant);
  const [a, m, j] = date.split("-").map(Number);
  const minuitUtc = Date.UTC(a, m - 1, j);
  const debut = new Date(minuitUtc - decalageMinutes(new Date(minuitUtc), fuseau) * 60_000);
  const lendemain = Date.UTC(a, m - 1, j + 1);
  const fin = new Date(lendemain - decalageMinutes(new Date(lendemain), fuseau) * 60_000);
  return { date, debut, fin };
}

export const chevaucheJour = (p: { dateDebut: string | Date; dateFin: string | Date }, jour: { debut: Date; fin: Date }) =>
  new Date(p.dateDebut).getTime() < jour.fin.getTime() && new Date(p.dateFin).getTime() > jour.debut.getTime();

/** Google Maps directions (the phone opens its maps app). */
export function lienItineraire(lieu: string | undefined | null): string | null {
  const texte = lieu?.trim();
  return texte ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(texte)}` : null;
}

/** Seed scripts tag their notes ("[seed:demo] …"): the tag is not for the team. */
export const nettoyerNotes = (notes: string | undefined) => notes?.replace(/^\s*(\[[^\]]+\]\s*)+/, "").trim() || undefined;

/** Statuses of equipment still to prepare and take today. */
export const STATUTS_A_PRENDRE: readonly StatutReservation[] = ["EN_ATTENTE", "CONFIRMEE"];

/**
 * Number on the app icon: equipment to take today that is not ticked "Packed" yet, plus the
 * overdue returns (in today's sessions or older). Zero clears the badge.
 */
export function compterBadge(journee: Pick<JourneeDTO, "seances" | "retards">, emballes: ReadonlySet<string>): number {
  const aFaire = journee.seances
    .flatMap((s) => s.reservations)
    .filter((r) => (STATUTS_A_PRENDRE.includes(r.statut) && !emballes.has(r.id)) || r.enRetard).length;
  return aFaire + journee.retards.length;
}

// ── Storage on the phone ─────────────────────────────────────────────────────

/**
 * Everything "My day" keeps on the device starts with this prefix and holds the user id: the
 * snapshot is only read back for the same user, and the whole prefix is removed at sign-out
 * (src/components/pwa/pwa-register.tsx).
 */
export const PREFIXE_STOCKAGE = "reframe:hors-ligne:";

export const cleInstantane = (utilisateurId: string, portee: PorteeJournee) => `${PREFIXE_STOCKAGE}materiel-journee:${utilisateurId}:${portee}`;
export const cleEmballes = (utilisateurId: string, date: string) => `${PREFIXE_STOCKAGE}materiel-emballe:${utilisateurId}:${date}`;
export const clePortee = (utilisateurId: string) => `${PREFIXE_STOCKAGE}materiel-portee:${utilisateurId}`;

/** A stored snapshot is used only if it is a day snapshot of this very user. */
export function instantaneValide(brut: unknown, utilisateurId: string): brut is JourneeDTO {
  if (!brut || typeof brut !== "object") return false;
  const j = brut as Partial<JourneeDTO>;
  return j.utilisateurId === utilisateurId && typeof j.date === "string" && Array.isArray(j.seances) && Array.isArray(j.retards) && Array.isArray(j.taches);
}
