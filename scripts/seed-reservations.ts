/**
 * npm run seed:reservations      (run `npm run seed:inventaire` first)
 * Docker: docker compose run --rm --build seed npx tsx scripts/seed-reservations.ts
 *
 * Real studio sessions and the equipment booked for them, using the inventory of
 * scripts/seed-inventaire.ts: finished shoots (equipment returned, some with remarks),
 * one shoot in progress, upcoming confirmed / pending shoots and one cancelled.
 *
 * Each session is written to `seances` (Séances module) AND, with the same id, to
 * `seances_demo`, the stand-in the Matériel module still reads (see seance-source.ts),
 * so the sessions appear in both modules and can be booked. Clients are external
 * contacts (no account needed); reservations are made by the ADMIN (ADMIN_EMAIL) and the
 * first active PHOTOGRAPHE (if any) is the lead photographer of every session.
 *
 * Idempotent: sessions tagged "[seed:reservations]" in their notes, their seances_demo
 * twins and their reservations are deleted and recreated. Dates are relative to today.
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { Materiel } from "../src/modules/materiel/materiel.model";
import type { StatutReservation } from "../src/modules/materiel/materiel.types";
import { ReservationMateriel } from "../src/modules/materiel/reservation-materiel.model";
import { SeanceDemo } from "../src/modules/materiel/seance-demo.model";
import type { StatutSeanceReel } from "../src/modules/seances/seance.dto";
import { Seance } from "../src/modules/seances/seance.model";
import { TypeEvenement } from "../src/modules/seances/type-evenement.model";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const TAG = "[seed:reservations]";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Same names and slugs as seed-facturation.ts / seed-demo.ts, so the scripts share them.
const TYPES = [
  { nom: "Wedding", slug: "wedding", description: "Ceremony and reception coverage." },
  { nom: "Engagement", slug: "engagement", description: "Couple session before the big day." },
  { nom: "Portrait", slug: "portrait", description: "Studio or outdoor portraits." },
  { nom: "Product", slug: "product", description: "Packshots and styled product scenes." },
  {
    nom: "Corporate event",
    slug: "corporate-event",
    description: "Conferences, launches and team events.",
  },
] as const;
type TypeSlug = (typeof TYPES)[number]["slug"];

type SessionSeed = {
  titre: string;
  type: TypeSlug;
  client: { nom: string; telephone: string; email?: string };
  lieu: string;
  /** Days from today (negative = past) and start hour (local studio time). */
  jour: number;
  heure: number;
  heures: number;
  statut: StatutSeanceReel;
  prix: number;
  /** Equipment serial numbers (scripts/seed-inventaire.ts) + optional return remarks. */
  materiel: string[];
  remarques?: Record<string, string>;
};

const SESSIONS: SessionSeed[] = [
  // ── Finished: equipment returned ──────────────────────────────────────────
  {
    titre: "Yasmine & Karim — wedding",
    type: "wedding",
    client: {
      nom: "Yasmine Ben Salem",
      telephone: "+216 22 418 905",
      email: "yasmine.bensalem@gmail.com",
    },
    lieu: "Dar El Marsa, La Marsa",
    jour: -38,
    heure: 14,
    heures: 10,
    statut: "TERMINEE",
    prix: 3200,
    materiel: [
      "032021003871",
      "032021007405",
      "4512003389",
      "6131000842",
      "2311001577",
      "AD6P-21K03187",
      "1581F6Z9C24A0035",
    ],
    remarques: {
      "1581F6Z9C24A0035": "One propeller chipped on landing, replaced from the spare set.",
    },
  },
  {
    titre: "Maison Jasmin — autumn collection packshots",
    type: "product",
    client: { nom: "Maison Jasmin", telephone: "+216 71 902 334", email: "studio@maisonjasmin.tn" },
    lieu: "ReFrame studio A, Les Berges du Lac",
    jour: -27,
    heure: 9,
    heures: 7,
    statut: "TERMINEE",
    prix: 1450,
    materiel: [
      "1BA04217",
      "2BA00731",
      "B10XP-2104418",
      "B10XP-2104452",
      "OCF-OCTA90-0417",
      "SAV-WT272-SET3",
      "TT-CUC15-ORG-2402",
    ],
  },
  {
    titre: "Nour & Mehdi — engagement at Sidi Bou Saïd",
    type: "engagement",
    client: { nom: "Nour Gharbi", telephone: "+216 98 551 207" },
    lieu: "Sidi Bou Saïd, Café des Nattes",
    jour: -19,
    heure: 17,
    heures: 3,
    statut: "TERMINEE",
    prix: 650,
    materiel: ["5148263", "1813327", "AD2P2-24C10552", "WC-301-2204"],
    remarques: { "WC-301-2204": "Zip on the cover is stuck." },
  },
  {
    titre: "Atelier Médina — team portraits",
    type: "portrait",
    client: { nom: "Atelier Médina", telephone: "+216 71 255 610", email: "rh@ateliermedina.tn" },
    lieu: "Atelier Médina offices, Tunis",
    jour: -12,
    heure: 10,
    heures: 4,
    statut: "TERMINEE",
    prix: 980,
    materiel: [
      "113032000519",
      "2311001577",
      "B10XP-2104418",
      "P120L-22B0911",
      "AVA2040-220513",
      "SK858D-J10482",
    ],
  },
  {
    titre: "Carthage Startup Summit 2026",
    type: "corporate-event",
    client: { nom: "Smart Capital", telephone: "+216 70 018 400", email: "events@smartcapital.tn" },
    lieu: "Palais des Congrès, Tunis",
    jour: -5,
    heure: 8,
    heures: 9,
    statut: "TERMINEE",
    prix: 2100,
    materiel: ["7011853", "20094415", "6032417", "1874402", "A10C-1906331", "TS512GCFE820-4PK"],
    remarques: { "A10C-1906331": "Battery holds charge for about half a day now." },
  },
  // ── In progress today ─────────────────────────────────────────────────────
  {
    titre: "Selma — maternity session",
    type: "portrait",
    client: {
      nom: "Selma Trabelsi",
      telephone: "+216 25 730 118",
      email: "selma.trabelsi@outlook.com",
    },
    lieu: "ReFrame studio B, Les Berges du Lac",
    jour: 0,
    heure: 8,
    heures: 14,
    statut: "EN_COURS",
    prix: 450,
    materiel: ["032021003871", "1621002093", "B10XP-2104452", "OCF-OCTA90-0417", "SAV-WT272-SET3"],
  },
  // ── Upcoming ──────────────────────────────────────────────────────────────
  {
    titre: "Ines & Walid — wedding",
    type: "wedding",
    client: {
      nom: "Ines Chaabane",
      telephone: "+216 55 204 873",
      email: "ines.chaabane@gmail.com",
    },
    lieu: "The Residence, Gammarth",
    jour: 4,
    heure: 13,
    heures: 11,
    statut: "CONFIRMEE",
    prix: 3500,
    materiel: [
      "032021007405",
      "113032000519",
      "4512003389",
      "6131000842",
      "2311001577",
      "AD2P2-24C10552",
      "AD2P2-24C10589",
      "6PRSC4F00B0218",
    ],
  },
  {
    titre: "Dar Zitouna — olive oil product launch",
    type: "product",
    client: { nom: "Dar Zitouna", telephone: "+216 74 228 016", email: "marketing@darzitouna.tn" },
    lieu: "ReFrame studio A, Les Berges du Lac",
    jour: 7,
    heure: 9,
    heures: 6,
    statut: "CONFIRMEE",
    prix: 1200,
    materiel: [
      "6032417",
      "1907751",
      "B10XP-2104418",
      "P120L-22B0911",
      "SAV-WT272-SET3",
      "TT-CUC15-ORG-2402",
    ],
  },
  {
    titre: "Ben Ammar family — portraits in Hammamet",
    type: "portrait",
    client: { nom: "Hichem Ben Ammar", telephone: "+216 20 671 449" },
    lieu: "Medina of Hammamet",
    jour: 11,
    heure: 16,
    heures: 3,
    statut: "EN_ATTENTE_CONFIRMATION",
    prix: 520,
    materiel: ["5148263", "56128834", "WC-301-2204"],
  },
  {
    titre: "TEDx Lac — conference coverage",
    type: "corporate-event",
    client: {
      nom: "TEDx Lac organising team",
      telephone: "+216 52 300 914",
      email: "contact@tedxlac.tn",
    },
    lieu: "Cité de la Culture, Tunis",
    jour: 16,
    heure: 8,
    heures: 10,
    statut: "CONFIRMEE",
    prix: 2400,
    materiel: [
      "7011853",
      "20094415",
      "032021003871",
      "6131000842",
      "APT600D-2201388",
      "GT1541T-773019",
    ],
  },
  {
    titre: "Rania & Youssef — engagement",
    type: "engagement",
    client: { nom: "Rania Mejri", telephone: "+216 29 845 302" },
    lieu: "Ennejma Ezzahra, Sidi Bou Saïd",
    jour: 22,
    heure: 17,
    heures: 3,
    statut: "DEMANDE_RECUE",
    prix: 650,
    materiel: ["3DQ11906", "AD2P2-24C10589"],
  },
  // ── Cancelled by the client ───────────────────────────────────────────────
  {
    titre: "Corporate headshots — Vermeg",
    type: "portrait",
    client: { nom: "Vermeg", telephone: "+216 71 860 100", email: "office@vermeg.example" },
    lieu: "Vermeg offices, Les Berges du Lac",
    jour: 9,
    heure: 9,
    heures: 5,
    statut: "ANNULEE",
    prix: 900,
    materiel: ["1BA04217", "B10XP-2104452"],
  },
];

function reservationStatus(s: StatutSeanceReel): StatutReservation {
  if (s === "TERMINEE") return "RETOURNEE";
  if (s === "EN_COURS") return "EN_COURS";
  if (s === "ANNULEE") return "ANNULEE";
  if (s === "CONFIRMEE") return "CONFIRMEE";
  return "EN_ATTENTE";
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("This seed cannot run in production.");
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const admin =
    (adminEmail && (await Utilisateur.findOne({ email: adminEmail, role: "ADMIN" }).lean())) ||
    (await Utilisateur.findOne({ role: "ADMIN" }).lean());
  if (!admin) throw new Error("No ADMIN account: run `npm run seed:admin` first.");
  // Lead photographer of every session: the first active PHOTOGRAPHE (none = empty team).
  // This links the photographer to the sessions' galleries (portfolio photo library).
  const photographe = await Utilisateur.findOne({ role: "PHOTOGRAPHE", statut: "ACTIF" })
    .sort({ createdAt: 1 })
    .lean();

  const serials = [...new Set(SESSIONS.flatMap((s) => s.materiel))];
  const materiels = await Materiel.find({ numeroSerie: { $in: serials } }).lean();
  const bySerial = new Map(materiels.map((m) => [m.numeroSerie, m]));
  const missing = serials.filter((s) => !bySerial.has(s));
  if (missing.length) {
    throw new Error(
      `Equipment missing (${missing.length}): run \`npm run seed:inventaire\` first.`,
    );
  }

  // Event types: reuse by slug, create the missing ones.
  const typeIds = new Map<TypeSlug, Types.ObjectId>();
  for (const t of TYPES) {
    const doc = await TypeEvenement.findOneAndUpdate(
      { slug: t.slug },
      { $setOnInsert: { ...t, actif: true } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    typeIds.set(t.slug, doc!._id as Types.ObjectId);
  }
  const typeName = new Map(TYPES.map((t) => [t.slug, t.nom]));

  // Replace the previous run.
  const old = await Seance.find({ notes: { $regex: `^\\${TAG}` } })
    .select("_id")
    .lean();
  const oldIds = old.map((s) => s._id);
  const removed = await Promise.all([
    ReservationMateriel.deleteMany({ seance: { $in: oldIds } }),
    SeanceDemo.deleteMany({ _id: { $in: oldIds } }),
    Seance.deleteMany({ _id: { $in: oldIds } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let reservationCount = 0;
  for (const s of SESSIONS) {
    const _id = new Types.ObjectId();
    const dateDebut = new Date(today.getTime() + s.jour * DAY + s.heure * HOUR);
    const dateFin = new Date(dateDebut.getTime() + s.heures * HOUR);
    await Seance.create({
      _id,
      titre: s.titre,
      clientExterne: s.client,
      typeEvenement: typeIds.get(s.type),
      dateDebut,
      dateFin,
      lieu: s.lieu,
      statut: s.statut,
      equipe: photographe ? [{ employe: photographe._id, role: "PHOTOGRAPHE_PRINCIPAL" }] : [],
      notes: `${TAG} Equipment booked in the Matériel module.`,
      prixFinal: s.prix,
    });
    await SeanceDemo.create({
      _id,
      titre: s.titre,
      typeEvenement: typeName.get(s.type),
      lieu: s.lieu,
      dateDebut,
      dateFin,
      statut: s.statut,
      clientNom: s.client.nom,
      photographe: admin._id,
      seed: true,
    });
    const statut = reservationStatus(s.statut);
    await ReservationMateriel.insertMany(
      s.materiel.map((serial) => ({
        materiel: bySerial.get(serial)!._id,
        seance: _id,
        seanceTitre: s.titre,
        typeEvenement: typeName.get(s.type)!,
        utilisateur: admin._id,
        dateDebut,
        dateFin,
        statut,
        remarqueRetour: s.remarques?.[serial],
        seed: true,
      })),
    );
    reservationCount += s.materiel.length;
  }

  const count = (key: (s: SessionSeed) => string) =>
    Object.entries(
      SESSIONS.reduce<Record<string, number>>(
        (acc, s) => ((acc[key(s)] = (acc[key(s)] ?? 0) + 1), acc),
        {},
      ),
    )
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ");
  console.log(
    `✔ ${SESSIONS.length} sessions and ${reservationCount} equipment reservations in "${mongoose.connection.name}" (replaced ${removed[2].deletedCount} sessions, ${removed[0].deletedCount} reservations).`,
  );
  console.log(`  Sessions: ${count((s) => s.statut)}`);
  console.log(`  Booked by ${admin.prenom} ${admin.nom}; ${serials.length} different items used.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
