import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listSeances: vi.fn(), findSeanceById: vi.fn(), listTaches: vi.fn(), listReservations: vi.fn(), findUtilisateurById: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/seances/seance.service", () => ({ listSeances: mocks.listSeances, findSeanceById: mocks.findSeanceById }));
vi.mock("@/modules/seances/tache.service", () => ({ listTaches: mocks.listTaches }));
vi.mock("../reservation-materiel.service", () => ({ listReservations: mocks.listReservations }));
vi.mock("@/modules/utilisateurs/utilisateur.service", () => ({ findUtilisateurById: mocks.findUtilisateurById }));

import { getMaJournee } from "../journee.service";
import { bornesJour, cleInstantane, compterBadge, instantaneValide, lienItineraire, nettoyerNotes, PREFIXE_STOCKAGE, type JourneeDTO } from "../journee.types";
import type { Reservation } from "../materiel.types";

const MAINTENANT = new Date("2027-03-10T09:00:00Z"); // 10:00 in Tunis

describe("the studio's day", () => {
  it("is a Tunis day (UTC+1), not a UTC day", () => {
    const { date, debut, fin } = bornesJour(new Date("2027-03-10T23:30:00Z")); // already 00:30 on the 11th in Tunis
    expect(date).toBe("2027-03-11");
    expect(debut.toISOString()).toBe("2027-03-10T23:00:00.000Z");
    expect(fin.toISOString()).toBe("2027-03-11T23:00:00.000Z");
  });

  it("builds directions links that survive accents and Arabic", () => {
    expect(lienItineraire("")).toBeNull();
    const lien = lienItineraire("Dar El Marsa, La Marsa & co")!;
    expect(new URL(lien).searchParams.get("destination")).toBe("Dar El Marsa, La Marsa & co");
    expect(new URL(lienItineraire("قصر الياسمين")!).searchParams.get("destination")).toBe("قصر الياسمين");
  });
});

describe("app badge and offline copy", () => {
  const r = (id: string, statut: string) => ({ id, statut }) as never;
  const journee = { seances: [{ reservations: [r("a", "EN_ATTENTE"), r("b", "CONFIRMEE"), r("c", "EN_COURS")] }], retards: [r("d", "EN_COURS")] } as unknown as JourneeDTO;

  it("counts the equipment to take that is not packed, plus overdue returns", () => {
    expect(compterBadge(journee, new Set())).toBe(3);
    expect(compterBadge(journee, new Set(["a", "b"]))).toBe(1);
    expect(compterBadge({ seances: [], retards: [] }, new Set())).toBe(0);
    // Late equipment of a session shown today counts too.
    const enRetard = { seances: [{ reservations: [{ id: "e", statut: "EN_COURS", enRetard: true }] }], retards: [] } as unknown as JourneeDTO;
    expect(compterBadge(enRetard, new Set())).toBe(1);
  });

  it("hides the seed tags of the notes from the team", () => {
    expect(nettoyerNotes("[seed:demo] c1")).toBe("c1");
    expect(nettoyerNotes("[seed:journee][x] Bring the 85mm")).toBe("Bring the 85mm");
    expect(nettoyerNotes("[seed:demo]")).toBeUndefined();
    expect(nettoyerNotes(undefined)).toBeUndefined();
  });

  it("keeps snapshots under one prefix, per user, and never reads another user's", () => {
    expect(cleInstantane("u1", "moi").startsWith(PREFIXE_STOCKAGE)).toBe(true);
    expect(cleInstantane("u1", "moi")).toContain(":u1:");
    const copie = { utilisateurId: "u1", date: "2027-03-10", seances: [], retards: [], taches: [] };
    expect(instantaneValide(copie, "u1")).toBe(true);
    expect(instantaneValide(copie, "u2")).toBe(false);
    expect(instantaneValide({ utilisateurId: "u1" }, "u1")).toBe(false);
    expect(instantaneValide(null, "u1")).toBe(false);
  });
});

// ── Service, with the Séances module and the reservations mocked ─────────────

const seance = (id: string, debut: string, fin: string, extra: Record<string, unknown> = {}) => ({
  id,
  titre: `Session ${id}`,
  client: { id: "c", prenom: "Amira", nom: "Ben Salem" },
  typeEvenement: { id: "t", nom: "Wedding" },
  pack: null,
  dateDebut: debut,
  dateFin: fin,
  lieu: "Villa Carthage",
  statut: "CONFIRMEE",
  equipe: [{ employe: { id: "photo", prenom: "Nour", nom: "P" }, role: "PHOTOGRAPHE_PRINCIPAL" }],
  createdAt: debut,
  ...extra,
});

const reservation = (id: string, seanceId: string, statut: Reservation["statut"], par: string, debut = "2027-03-10T08:00:00Z", fin = "2027-03-10T18:00:00Z"): Reservation => ({
  id,
  dateDebut: debut,
  dateFin: fin,
  statut,
  materiel: { id: `m-${id}`, nom: `Item ${id}`, categorie: "OBJECTIF", numeroSerie: `SN-${id}` },
  seance: { id: seanceId, titre: `Session ${seanceId}`, typeEvenement: "Wedding" },
  utilisateur: { id: par, prenom: par, nom: "X" },
});

describe("getMaJournee", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findSeanceById.mockResolvedValue(null);
    mocks.findUtilisateurById.mockResolvedValue({ id: "c", telephone: "22 123 456", email: "amira@mail.tn" });
    mocks.listTaches.mockResolvedValue([
      { id: "t1", titre: "Prepare the equipment list", seance: { id: "s1", titre: "Session s1", dateDebut: "" }, employe: null, dateLimite: "2027-03-10T15:00:00Z", priorite: "HAUTE", phase: "AVANT", statut: "A_FAIRE", enRetard: false, createdAt: "" },
      { id: "t2", titre: "Tomorrow's task", seance: { id: "s1", titre: "Session s1", dateDebut: "" }, employe: null, dateLimite: "2027-03-11T15:00:00Z", priorite: "NORMALE", phase: "AVANT", statut: "A_FAIRE", enRetard: false, createdAt: "" },
    ]);
  });

  it("shows a photographer their sessions of today, their equipment and their tasks", async () => {
    mocks.listSeances.mockResolvedValue([
      seance("s1", "2027-03-10T10:00:00Z", "2027-03-10T16:00:00Z"),
      seance("s2", "2027-03-11T10:00:00Z", "2027-03-11T16:00:00Z"),
      seance("s3", "2027-03-10T12:00:00Z", "2027-03-10T13:00:00Z", { statut: "ANNULEE" }),
    ]);
    mocks.listReservations.mockImplementation(async (f: { statut?: string }) =>
      f.statut === "EN_COURS"
        ? [reservation("late", "s0", "EN_COURS", "photo", "2027-03-08T08:00:00Z", "2027-03-09T18:00:00Z"), reservation("other", "s9", "EN_COURS", "someone", "2027-03-08T08:00:00Z", "2027-03-09T18:00:00Z")]
        : [reservation("r1", "s1", "CONFIRMEE", "admin"), reservation("r2", "s1", "ANNULEE", "admin"), reservation("r3", "s9", "EN_ATTENTE", "someone")],
    );

    const j = await getMaJournee({ id: "photo", role: "PHOTOGRAPHE" }, "tous", MAINTENANT);

    expect(mocks.listSeances).toHaveBeenCalledWith({ employeId: "photo" }); // "Everyone" is for admins only
    expect(j.portee).toBe("moi");
    expect(j.seances.map((s) => s.id)).toEqual(["s1"]);
    expect(j.seances[0].reservations.map((r) => r.id)).toEqual(["r1"]);
    expect(j.seances[0].reservations[0].peutAgir).toBe(false); // booked by the admin
    expect(j.seances[0].itineraire).toContain("destination=Villa%20Carthage");
    expect(j.retards.map((r) => r.id)).toEqual(["late"]);
    // Today's task of a session shown today sits in that session, not in the loose list.
    expect(j.seances[0].taches.map((t) => t.id)).toEqual(["t1"]);
    expect(j.taches).toEqual([]);
    expect(j.resume).toEqual({ seances: 1, equipements: 1, taches: 1 });
    expect(j.seances[0].clientTelephone).toBe("22 123 456");
    expect(j.seances[0].equipe[0].moi).toBe(true);
    expect(mocks.listTaches).toHaveBeenCalledWith({ employeId: "photo" });
  });

  it("also shows a session the user booked equipment for without being on its team", async () => {
    mocks.listSeances.mockResolvedValue([]);
    mocks.findSeanceById.mockResolvedValue(seance("s5", "2027-03-10T14:00:00Z", "2027-03-10T17:00:00Z"));
    mocks.listReservations.mockImplementation(async (f: { statut?: string }) => (f.statut ? [] : [reservation("r5", "s5", "EN_ATTENTE", "photo")]));

    const j = await getMaJournee({ id: "photo", role: "PHOTOGRAPHE" }, "moi", MAINTENANT);
    expect(j.seances.map((s) => s.id)).toEqual(["s5"]);
    expect(j.seances[0].reservations[0].peutAgir).toBe(true);
  });

  it("flags late equipment inside today's session instead of listing it twice", async () => {
    mocks.listSeances.mockResolvedValue([seance("s1", "2027-03-10T06:00:00Z", "2027-03-10T08:00:00Z", { notes: "[seed:x] Bring the 85mm", clientExterne: { nom: "Selma", telephone: "98 765 432" }, client: null })]);
    const late = reservation("r1", "s1", "EN_COURS", "photo", "2027-03-10T06:00:00Z", "2027-03-10T08:30:00Z");
    mocks.listReservations.mockImplementation(async (f: { statut?: string }) => (f.statut ? [late] : [late]));

    const j = await getMaJournee({ id: "photo", role: "PHOTOGRAPHE" }, "moi", MAINTENANT);
    expect(j.seances[0].reservations[0].enRetard).toBe(true);
    expect(j.retards).toEqual([]);
    expect(j.seances[0].notes).toBe("Bring the 85mm");
    expect(j.seances[0].clientTelephone).toBe("98 765 432");
    expect(mocks.findUtilisateurById).not.toHaveBeenCalled();
  });

  it("lets an admin see everyone, and act on every reservation", async () => {
    mocks.listSeances.mockResolvedValue([seance("s1", "2027-03-10T10:00:00Z", "2027-03-10T16:00:00Z")]);
    mocks.listReservations.mockImplementation(async (f: { statut?: string }) =>
      f.statut ? [reservation("other", "s9", "EN_COURS", "someone", "2027-03-08T08:00:00Z", "2027-03-09T18:00:00Z")] : [reservation("r1", "s1", "EN_ATTENTE", "someone")],
    );

    const j = await getMaJournee({ id: "admin", role: "ADMIN" }, "tous", MAINTENANT);
    expect(mocks.listSeances).toHaveBeenCalledWith({});
    expect(j.portee).toBe("tous");
    expect(j.seances[0].reservations[0].peutAgir).toBe(true);
    expect(j.retards.map((r) => r.id)).toEqual(["other"]);
  });
});
