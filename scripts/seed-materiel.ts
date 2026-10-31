/**
 * npm run seed:materiel
 * Docker: docker compose run --rm seed npx tsx scripts/seed-materiel.ts
 *
 * Test data for the Matériel module: 14 pieces of equipment (upserted by serial number),
 * demo sessions in `seances_demo` (stand-in for the Séances module) and equipment
 * reservations with a history of returned items for the future AI kit suggestion.
 *
 * Idempotent: every run deletes ONLY the documents marked `seed: true` in `seances_demo` and
 * `reservations_materiel`, then recreates them; equipment is updated by serial number.
 * All dates are relative to today. Never runs in production.
 *
 * One studio, two accounts, both only READ by e-mail (never created or changed):
 * - the ADMIN (ADMIN_EMAIL): photographer / team of every session and author of every reservation;
 * - the studio's client amel.mediouni@gmail.com (Amoulette): client of every demo session.
 */
import mongoose, { type Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { mockImage } from "../src/lib/mock-images";
import { Materiel } from "../src/modules/materiel/materiel.model";
import type {
  CategorieMateriel,
  EtatMateriel,
  StatutReservation,
} from "../src/modules/materiel/materiel.types";
import { ReservationMateriel } from "../src/modules/materiel/reservation-materiel.model";
import { seChevauchent } from "../src/modules/materiel/reservation-materiel.rules";
import { SeanceDemo } from "../src/modules/materiel/seance-demo.model";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";
import { DAY, DEMO_CLIENT_EMAIL, DEMO_CLIENT_NOM, DEMO_SEANCES, HOUR } from "./demo-seances";

const CLIENT_EMAIL = DEMO_CLIENT_EMAIL;
const CLIENT_NOM = DEMO_CLIENT_NOM;

// ── Equipment ───────────────────────────────────────────────────────────────

type MaterielSeed = {
  key: string;
  nom: string;
  categorie: CategorieMateriel;
  marque: string;
  modele: string;
  numeroSerie: string;
  etat: EtatMateriel;
  ageDays: number;
  prix: number;
  disponible: boolean;
  photo: number;
};

const MATERIELS: MaterielSeed[] = [
  {
    key: "r5",
    nom: "Canon EOS R5",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS R5",
    numeroSerie: "CR5-0349211",
    etat: "BON",
    ageDays: 620,
    prix: 11900,
    disponible: true,
    photo: 2,
  },
  {
    key: "a7",
    nom: "Sony Alpha 7 IV",
    categorie: "APPAREIL_PHOTO",
    marque: "Sony",
    modele: "A7 IV",
    numeroSerie: "SA7-5520193",
    etat: "NEUF",
    ageDays: 90,
    prix: 8400,
    disponible: true,
    photo: 1,
  },
  {
    key: "r6",
    nom: "Canon EOS R6 Mark II",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS R6 II",
    numeroSerie: "CR6II-88123",
    etat: "BON",
    ageDays: 300,
    prix: 7900,
    disponible: true,
    photo: 2,
  },
  {
    key: "rf85",
    nom: "RF 85 mm f/1.2",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 85mm F1.2 L",
    numeroSerie: "RF85-11823",
    etat: "BON",
    ageDays: 540,
    prix: 9200,
    disponible: true,
    photo: 3,
  },
  {
    key: "rf2470",
    nom: "RF 24-70 mm f/2.8",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 24-70mm F2.8 L",
    numeroSerie: "RF2470-7731",
    etat: "USE",
    ageDays: 1100,
    prix: 7600,
    disponible: true,
    photo: 3,
  },
  {
    key: "gm70200",
    nom: "FE 70-200 mm f/2.8 GM II",
    categorie: "OBJECTIF",
    marque: "Sony",
    modele: "SEL70200GM2",
    numeroSerie: "SFE70200-44102",
    etat: "NEUF",
    ageDays: 45,
    prix: 9800,
    disponible: true,
    photo: 3,
  },
  {
    key: "b10",
    nom: "Profoto B10X",
    categorie: "ECLAIRAGE",
    marque: "Profoto",
    modele: "B10X",
    numeroSerie: "PB10-22019",
    etat: "BON",
    ageDays: 400,
    prix: 6500,
    disponible: true,
    photo: 0,
  },
  {
    key: "octa",
    nom: "Octagonal softbox 120 cm",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "OCTA 120",
    numeroSerie: "GD-OC-8821",
    etat: "BON",
    ageDays: 700,
    prix: 480,
    disponible: true,
    photo: 0,
  },
  {
    key: "ad600",
    nom: "Godox AD600 Pro",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "AD600 Pro",
    numeroSerie: "AD600PRO-12077",
    etat: "USE",
    ageDays: 980,
    prix: 2900,
    disponible: true,
    photo: 0,
  },
  {
    key: "v1",
    nom: "Speedlight flash",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "V1",
    numeroSerie: "GV1-55120",
    etat: "EN_PANNE",
    ageDays: 800,
    prix: 950,
    disponible: false,
    photo: 2,
  },
  {
    key: "carbon",
    nom: "Carbon tripod",
    categorie: "TREPIED",
    marque: "Manfrotto",
    modele: "190 Carbon",
    numeroSerie: "MF190-3310",
    etat: "USE",
    ageDays: 1500,
    prix: 1100,
    disponible: true,
    photo: 4,
  },
  // Kept unavailable (on loan) to test that refusal.
  {
    key: "befree",
    nom: "Travel tripod",
    categorie: "TREPIED",
    marque: "Manfrotto",
    modele: "Befree Advanced",
    numeroSerie: "MFBA-90211",
    etat: "BON",
    ageDays: 210,
    prix: 690,
    disponible: false,
    photo: 4,
  },
  {
    key: "drone",
    nom: "Drone DJI Mini 4 Pro",
    categorie: "ACCESSOIRE",
    marque: "DJI",
    modele: "Mini 4 Pro",
    numeroSerie: "DJM4-77120",
    etat: "NEUF",
    ageDays: 60,
    prix: 3900,
    disponible: true,
    photo: 1,
  },
  {
    key: "reflector",
    nom: "5-in-1 reflector",
    categorie: "ACCESSOIRE",
    marque: "Neewer",
    modele: "110 cm",
    numeroSerie: "NW-RF-1010",
    etat: "BON",
    ageDays: 300,
    prix: 120,
    disponible: true,
    photo: 0,
  },
];

// ── Demo sessions (seances_demo) ────────────────────────────────────────────

// Shared with scripts/seed-demo.ts (real `seances`): same titles, types and dates.
const now = new Date();
const SEANCES = DEMO_SEANCES;

// ── Equipment reservations ──────────────────────────────────────────────────

type ReservationSeed = {
  seance: string;
  materiels: string[];
  statut: StatutReservation;
  remarques?: string[];
};

const RESERVATIONS: ReservationSeed[] = [
  // History: returned items for every session type
  {
    seance: "p1",
    materiels: ["r6", "rf2470", "octa"],
    statut: "RETOURNEE",
    remarques: ["", "Zoom ring slightly stiff.", ""],
  },
  {
    seance: "p2",
    materiels: ["r5", "gm70200", "drone"],
    statut: "RETOURNEE",
    remarques: ["Battery needs charging.", "", "One propeller replaced."],
  },
  { seance: "p3", materiels: ["a7", "rf85", "b10", "reflector"], statut: "RETOURNEE" },
  {
    seance: "p4",
    materiels: ["a7", "rf2470", "v1"],
    statut: "RETOURNEE",
    remarques: ["", "", "Flash misfired twice during the evening."],
  },
  {
    seance: "p5",
    materiels: ["r6", "ad600", "carbon"],
    statut: "RETOURNEE",
    remarques: ["", "", "Leg lock worn."],
  },
  { seance: "p6", materiels: ["r5", "gm70200", "drone"], statut: "RETOURNEE" },
  {
    seance: "p7",
    materiels: ["a7", "befree"],
    statut: "RETOURNEE",
    remarques: ["Sensor dust spotted.", ""],
  },
  // In use right now
  { seance: "c1", materiels: ["a7", "rf85", "b10"], statut: "EN_COURS" },
  // Upcoming
  { seance: "u1", materiels: ["r6", "rf2470", "ad600"], statut: "CONFIRMEE" },
  { seance: "u2", materiels: ["a7", "b10"], statut: "CONFIRMEE" },
  { seance: "u3", materiels: ["r5", "rf85", "octa"], statut: "EN_ATTENTE" },
  { seance: "u4", materiels: ["a7"], statut: "ANNULEE" },
  { seance: "u5", materiels: ["r5", "gm70200", "drone"], statut: "CONFIRMEE" },
  { seance: "u5", materiels: ["carbon"], statut: "EN_ATTENTE" },
  { seance: "u6", materiels: ["r6"], statut: "EN_ATTENTE" },
];

type UserLean = { _id: Types.ObjectId; nom: string; prenom: string };

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The materiel seed cannot run in production.");
  }
  await connectDB();

  // The studio's two accounts: read only, by e-mail.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("ADMIN_EMAIL is not set.");
  const [admin, client] = await Promise.all([
    Utilisateur.findOne({ email: adminEmail, role: "ADMIN" }).select("nom prenom").lean<UserLean>(),
    Utilisateur.findOne({ email: CLIENT_EMAIL, role: "CLIENT" })
      .select("nom prenom")
      .lean<UserLean>(),
  ]);
  if (!admin) {
    throw new Error(
      `No ADMIN account for ADMIN_EMAIL: create it first (seed-admin), then run this seed again.`,
    );
  }
  if (!client) {
    throw new Error(
      `No CLIENT account for ${CLIENT_EMAIL}: sign up with it first, then run this seed again.`,
    );
  }

  // 1. Equipment, upserted by serial number.
  for (const m of MATERIELS) {
    const { key: _key, ageDays, photo, ...fields } = m;
    await Materiel.updateOne(
      { numeroSerie: m.numeroSerie },
      {
        $set: {
          ...fields,
          dateAchat: new Date(Date.now() - ageDays * DAY),
          photo: mockImage("studio", photo),
          archive: false,
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  const materielDocs = await Materiel.find({
    numeroSerie: { $in: MATERIELS.map((m) => m.numeroSerie) },
  }).lean();
  const materielBySerial = new Map(materielDocs.map((d) => [d.numeroSerie, d]));
  const materielByKey = new Map(
    MATERIELS.map((m) => [m.key, materielBySerial.get(m.numeroSerie)!]),
  );

  // 2. Demo sessions: only the seeded ones are replaced.
  const removedReservations = await ReservationMateriel.deleteMany({ seed: true });
  const removedSeances = await SeanceDemo.deleteMany({ seed: true });
  const seanceDocs = await SeanceDemo.insertMany(
    SEANCES.map((s) => ({
      titre: s.titre,
      typeEvenement: s.type,
      lieu: s.lieu,
      dateDebut: s.debut,
      dateFin: new Date(s.debut.getTime() + s.heures * HOUR),
      statut: s.statut,
      client: client._id,
      clientNom: CLIENT_NOM,
      photographe: admin._id,
      seed: true,
    })),
  );
  const seanceByKey = new Map(SEANCES.map((s, i) => [s.key, seanceDocs[i]]));

  // 3. Reservations over each session's own period, all made by the admin for the studio.
  const reservations = RESERVATIONS.flatMap((r) => {
    const seance = seanceByKey.get(r.seance)!;
    return r.materiels.map((key, j) => ({
      materiel: materielByKey.get(key)!._id,
      seance: seance._id,
      seanceTitre: seance.titre,
      typeEvenement: seance.typeEvenement,
      utilisateur: admin._id,
      dateDebut: seance.dateDebut,
      dateFin: seance.dateFin,
      statut: r.statut,
      remarqueRetour: r.remarques?.[j] || undefined,
      seed: true,
    }));
  });

  // Safety net: no two reservations of the same item may overlap (whatever their status).
  for (const [a, ra] of reservations.entries()) {
    for (const rb of reservations.slice(a + 1)) {
      if (ra.materiel.equals(rb.materiel) && seChevauchent(ra, rb)) {
        throw new Error(
          `Seed data overlap on one item: "${ra.seanceTitre}" / "${rb.seanceTitre}".`,
        );
      }
    }
  }
  // Upcoming reservations must target equipment that can really be reserved.
  for (const r of reservations) {
    const m = materielDocs.find((d) => d._id.equals(r.materiel))!;
    const usable = !m.archive && m.disponible && m.etat !== "EN_PANNE";
    if (r.dateFin > now && r.statut !== "ANNULEE" && !usable) {
      throw new Error(`Seed data books unusable equipment: ${m.nom} for "${r.seanceTitre}".`);
    }
  }
  await ReservationMateriel.insertMany(reservations);

  const count = <T>(items: T[], key: (item: T) => string) =>
    Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        acc[key(item)] = (acc[key(item)] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
  console.log(`Equipment: ${MATERIELS.length} upserted by serial number.`);
  console.log(
    `Demo sessions: ${seanceDocs.length} created (${removedSeances.deletedCount} seeded ones replaced) — ${count(SEANCES, (s) => s.type)}.`,
  );
  console.log(
    `Reservations: ${reservations.length} created (${removedReservations.deletedCount} seeded ones replaced) — ${count(reservations, (r) => r.statut)}.`,
  );
  console.log(
    `Returned history by type: ${count(
      reservations.filter((r) => r.statut === "RETOURNEE"),
      (r) => r.typeEvenement,
    )}.`,
  );
  console.log(
    `Client: ${CLIENT_NOM} · team and reservations: ${admin.prenom} ${admin.nom} (ADMIN).`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
