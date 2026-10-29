/**
 * npm run seed:stats
 *
 * Seeds 12 months of realistic session data so the Statistics page is fully populated.
 * Creates sessions across all 5 periods (30j, 90j, 12m, annee, a-venir) with:
 *  - All event types (Wedding, Engagement, Portrait, Corporate event)
 *  - All statuses including TERMINEE, ANNULEE, REPORTEE (for cancellation / postponement rates)
 *  - All packs + some custom sessions
 *  - Multiple photographers on the team (workload table)
 *  - Sessions with lieuId set (outdoor ones trigger weather alerts if meteo is enabled)
 *  - prixFinal and nombreReports filled on past sessions
 *
 * Idempotent: seeded sessions (notes starting with "[seed:stats]") are deleted first.
 * Run after seed:demo so the catalogue (event types, packs) already exists.
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { Pack } from "../src/modules/seances/pack.model";
import { Prestation } from "../src/modules/seances/prestation.model";
import { Seance } from "../src/modules/seances/seance.model";
import { Tache } from "../src/modules/seances/tache.model";
import { TypeEvenement } from "../src/modules/seances/type-evenement.model";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const SEED_TAG = "[seed:stats]";
const HOUR = 3_600_000;
const DAY = 86_400_000;

type TypeDemo = "Wedding" | "Engagement" | "Portrait" | "Corporate event";

// ─── Catalogue (upsert — reuse if seed:demo already ran) ────────────────────

const CATALOGUE_TYPES: { nom: TypeDemo; slug: string; description: string }[] = [
  { nom: "Wedding", slug: "wedding", description: "Ceremony and reception coverage." },
  { nom: "Engagement", slug: "engagement", description: "Couple session before the big day." },
  { nom: "Portrait", slug: "portrait", description: "Studio or outdoor portraits." },
  { nom: "Corporate event", slug: "corporate-event", description: "Conferences, launches and team events." },
];

const CATALOGUE_PRESTATIONS = [
  { nom: "Lead photographer", unite: "hours" },
  { nom: "Second photographer", unite: "hours" },
  { nom: "Retouched photos (HD)", unite: "photos" },
  { nom: "Private online gallery", unite: "months" },
  { nom: "Printed album 30x30", unite: "album" },
  { nom: "Studio rental", unite: "hours" },
  { nom: "Highlight video", unite: "minutes" },
  { nom: "Drone shots", unite: "flight" },
];

type PackCatalogue = {
  type: TypeDemo; nom: string; prix: number; minutes: number;
  description: string; lignes: [string, number][];
};
const CATALOGUE_PACKS: PackCatalogue[] = [
  {
    type: "Wedding", nom: "Essential", prix: 1800, minutes: 480,
    description: "The day from the ceremony to the first dance.",
    lignes: [["Lead photographer", 8], ["Retouched photos (HD)", 300], ["Private online gallery", 6]],
  },
  {
    type: "Wedding", nom: "Signature", prix: 3200, minutes: 600,
    description: "Two photographers, album and video.",
    lignes: [["Lead photographer", 10], ["Second photographer", 8], ["Retouched photos (HD)", 600], ["Printed album 30x30", 1], ["Highlight video", 5]],
  },
  {
    type: "Engagement", nom: "Golden hour", prix: 450, minutes: 120,
    description: "Outdoor couple session at sunset.",
    lignes: [["Lead photographer", 2], ["Retouched photos (HD)", 40], ["Private online gallery", 3]],
  },
  {
    type: "Portrait", nom: "Studio portrait", prix: 280, minutes: 60,
    description: "Individual or team portraits in the studio.",
    lignes: [["Studio rental", 1], ["Lead photographer", 1], ["Retouched photos (HD)", 15]],
  },
  {
    type: "Corporate event", nom: "Half day", prix: 1200, minutes: 240,
    description: "Up to 4 hours of event coverage.",
    lignes: [["Lead photographer", 4], ["Retouched photos (HD)", 150], ["Private online gallery", 12]],
  },
];

async function upsertOne<T>(
  model: mongoose.Model<T>,
  filter: Record<string, unknown>,
  data: Partial<T>,
): Promise<Types.ObjectId> {
  const existing = await model
    .findOne(filter).collation({ locale: "fr", strength: 1 })
    .select("_id").lean<{ _id: Types.ObjectId }>();
  if (existing) return existing._id;
  const doc = await model.create(data);
  return doc._id as Types.ObjectId;
}

async function ensureCatalogue() {
  const typeIds = new Map<TypeDemo, Types.ObjectId>();
  for (const t of CATALOGUE_TYPES) {
    typeIds.set(t.nom, await upsertOne(TypeEvenement, { nom: t.nom }, { ...t, actif: true }));
  }
  const prestIds = new Map<string, Types.ObjectId>();
  for (const p of CATALOGUE_PRESTATIONS) {
    prestIds.set(p.nom, await upsertOne(Prestation, { nom: p.nom }, { ...p, actif: true }));
  }
  const packIds = new Map<string, Types.ObjectId>();
  for (const p of CATALOGUE_PACKS) {
    const typeId = typeIds.get(p.type)!;
    packIds.set(p.nom, await upsertOne(Pack, { typeEvenement: typeId, nom: p.nom }, {
      nom: p.nom, typeEvenement: typeId, description: p.description,
      prix: p.prix, afficherPrix: true, dureeEstimeeMinutes: p.minutes,
      statut: "PUBLIE",
      prestations: p.lignes.map(([nom, quantite]) => ({
        prestation: prestIds.get(nom)!, quantite,
      })),
      options: [],
    }));
  }
  return { typeIds, packIds };
}

/** Date `days` from today at `hour:00` local time. */
function at(days: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Random integer in [min, max]. */
function ri(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Session templates ──────────────────────────────────────────────────────

type SessionSpec = {
  titre: string;
  type: TypeDemo;
  pack?: string; // pack name; omit = custom service
  lieu: string;
  days: number; // offset from today (negative = past)
  hour: number;
  durationH: number;
  statut: "TERMINEE" | "ANNULEE" | "REPORTEE" | "CONFIRMEE" | "EN_ATTENTE_CONFIRMATION" | "DEMANDE_RECUE";
  nombreReports?: number;
  prixFinal?: number;
  equipe?: number; // number of photographers to assign (up to available)
};

// 12 months of history: ~60 sessions with varied types, statuses and packs
const SESSIONS: SessionSpec[] = [
  // ── 12 months ago ──────────────────────────────────────────────────────
  { titre: "Wedding — Tunis Palace", type: "Wedding", pack: "Signature", lieu: "Palais du Belvédère, Tunis", days: -360, hour: 14, durationH: 9, statut: "TERMINEE", prixFinal: 3200, equipe: 2 },
  { titre: "New year corporate gala", type: "Corporate event", pack: "Half day", lieu: "Hotel Laico, Tunis", days: -355, hour: 18, durationH: 5, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },
  { titre: "Portrait — tech startup", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: -348, hour: 10, durationH: 2, statut: "TERMINEE", prixFinal: 280, equipe: 1 },
  { titre: "Engagement — Sidi Bou Said", type: "Engagement", pack: "Golden hour", lieu: "Sidi Bou Said", days: -340, hour: 16, durationH: 3, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Product launch event", type: "Corporate event", lieu: "Centre de Conférences Yasmine, Hammamet", days: -335, hour: 9, durationH: 6, statut: "TERMINEE", prixFinal: 1500, equipe: 2 },
  { titre: "Wedding — Beach ceremony", type: "Wedding", pack: "Essential", lieu: "Hammamet beach", days: -325, hour: 15, durationH: 8, statut: "TERMINEE", prixFinal: 1800, equipe: 2 },
  { titre: "Family portraits", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: -318, hour: 11, durationH: 2, statut: "ANNULEE", equipe: 1 },
  { titre: "Brand day — finance sector", type: "Corporate event", pack: "Half day", lieu: "Hotel Movenpick, Lac", days: -310, hour: 9, durationH: 4, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },

  // ── 9 months ago ──────────────────────────────────────────────────────
  { titre: "Wedding — Gammarth garden", type: "Wedding", pack: "Signature", lieu: "Gammarth", days: -275, hour: 14, durationH: 9, statut: "TERMINEE", prixFinal: 3400, nombreReports: 1, equipe: 2 },
  { titre: "Engagement — Carthage ruins", type: "Engagement", pack: "Golden hour", lieu: "Carthage", days: -268, hour: 17, durationH: 2, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Annual meeting portraits", type: "Portrait", lieu: "Amoulette head office, Tunis", days: -260, hour: 9, durationH: 3, statut: "TERMINEE", prixFinal: 600, equipe: 1 },
  { titre: "Outdoor concert coverage", type: "Corporate event", pack: "Half day", lieu: "Amphithéâtre de Carthage", days: -254, hour: 20, durationH: 4, statut: "TERMINEE", prixFinal: 1400, equipe: 2 },
  { titre: "Wedding — cancelled", type: "Wedding", pack: "Essential", lieu: "Sousse", days: -248, hour: 14, durationH: 8, statut: "ANNULEE" },
  { titre: "Engagement couple shoot", type: "Engagement", pack: "Golden hour", lieu: "Sidi Bou Said", days: -240, hour: 16, durationH: 3, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Training day photos", type: "Corporate event", pack: "Half day", lieu: "Les Berges du Lac, Tunis", days: -232, hour: 8, durationH: 4, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },

  // ── 6 months ago ──────────────────────────────────────────────────────
  { titre: "Wedding — Sfax ceremony", type: "Wedding", pack: "Signature", lieu: "Sfax", days: -185, hour: 14, durationH: 10, statut: "TERMINEE", prixFinal: 3200, equipe: 2 },
  { titre: "Fashion brand portraits", type: "Portrait", lieu: "ReFrame studio, Tunis", days: -178, hour: 10, durationH: 4, statut: "TERMINEE", prixFinal: 900, equipe: 2 },
  { titre: "Engagement at La Marsa", type: "Engagement", pack: "Golden hour", lieu: "La Marsa beach", days: -172, hour: 17, durationH: 2, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Startup pitch event", type: "Corporate event", pack: "Half day", lieu: "Impact Hub, Tunis", days: -165, hour: 14, durationH: 4, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },
  { titre: "Wedding — Monastir", type: "Wedding", pack: "Essential", lieu: "Monastir", days: -158, hour: 15, durationH: 8, statut: "REPORTEE", nombreReports: 2, equipe: 2 },
  { titre: "Portrait session cancelled last minute", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: -151, hour: 11, durationH: 2, statut: "ANNULEE" },
  { titre: "Museum opening event", type: "Corporate event", lieu: "Musée National du Bardo", days: -145, hour: 10, durationH: 6, statut: "TERMINEE", prixFinal: 1800, equipe: 2 },
  { titre: "Wedding — Sidi Bou Said", type: "Wedding", pack: "Signature", lieu: "Sidi Bou Said", days: -140, hour: 14, durationH: 9, statut: "TERMINEE", prixFinal: 3500, equipe: 2 },

  // ── 3 months ago (90j) ──────────────────────────────────────────────
  { titre: "Tech conference coverage", type: "Corporate event", pack: "Half day", lieu: "Palais des Congrès, Tunis", days: -85, hour: 9, durationH: 8, statut: "TERMINEE", prixFinal: 1600, equipe: 2 },
  { titre: "Engagement — golden hour Hammamet", type: "Engagement", pack: "Golden hour", lieu: "Hammamet beach", days: -80, hour: 17, durationH: 3, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Wedding — Nabeul garden", type: "Wedding", pack: "Signature", lieu: "Nabeul", days: -74, hour: 15, durationH: 9, statut: "TERMINEE", prixFinal: 3200, equipe: 2 },
  { titre: "Product photography", type: "Portrait", lieu: "ReFrame studio, Tunis", days: -67, hour: 10, durationH: 3, statut: "TERMINEE", prixFinal: 650, equipe: 1 },
  { titre: "Annual employee portraits", type: "Portrait", pack: "Studio portrait", lieu: "Les Berges du Lac, Tunis", days: -62, hour: 9, durationH: 5, statut: "TERMINEE", prixFinal: 280, equipe: 1 },
  { titre: "Restaurant launch party", type: "Corporate event", pack: "Half day", lieu: "La Marsa", days: -58, hour: 19, durationH: 4, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },
  { titre: "Wedding — Djerba", type: "Wedding", pack: "Essential", lieu: "Djerba", days: -52, hour: 14, durationH: 8, statut: "ANNULEE", nombreReports: 1 },
  { titre: "Engagement at Medina", type: "Engagement", pack: "Golden hour", lieu: "Médina de Tunis", days: -46, hour: 16, durationH: 2, statut: "TERMINEE", prixFinal: 450, equipe: 1 },

  // ── Last 30 days ──────────────────────────────────────────────────────
  { titre: "Wedding — Tunis rooftop", type: "Wedding", pack: "Signature", lieu: "Tunis rooftop venue", days: -28, hour: 16, durationH: 8, statut: "TERMINEE", prixFinal: 3200, equipe: 2 },
  { titre: "Portrait — medical team", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: -24, hour: 10, durationH: 3, statut: "TERMINEE", prixFinal: 560, equipe: 1 },
  { titre: "NGO fundraiser event", type: "Corporate event", pack: "Half day", lieu: "Institut Français, Tunis", days: -20, hour: 18, durationH: 4, statut: "TERMINEE", prixFinal: 1200, equipe: 1 },
  { titre: "Engagement — Hammam-Lif", type: "Engagement", pack: "Golden hour", lieu: "Hammam-Lif beach", days: -16, hour: 17, durationH: 2, statut: "TERMINEE", prixFinal: 450, equipe: 1 },
  { titre: "Architecture firm portraits", type: "Portrait", lieu: "ReFrame studio, Tunis", days: -12, hour: 9, durationH: 4, statut: "TERMINEE", prixFinal: 800, equipe: 1 },
  { titre: "Wedding — postponed to next month", type: "Wedding", pack: "Essential", lieu: "Sousse beach resort", days: -8, hour: 15, durationH: 8, statut: "REPORTEE", nombreReports: 1, equipe: 2 },
  { titre: "Charity gala evening", type: "Corporate event", pack: "Half day", lieu: "Hotel Sheraton, Tunis", days: -5, hour: 19, durationH: 5, statut: "TERMINEE", prixFinal: 1500, equipe: 2 },
  { titre: "Portrait — law firm", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: -3, hour: 10, durationH: 2, statut: "TERMINEE", prixFinal: 280, equipe: 1 },

  // ── Next 30 days (a-venir) ─────────────────────────────────────────
  { titre: "Wedding — Lac Tunis terrace", type: "Wedding", pack: "Signature", lieu: "Les Berges du Lac, Tunis", days: 4, hour: 15, durationH: 9, statut: "CONFIRMEE", equipe: 2 },
  { titre: "Engagement pre-shoot", type: "Engagement", pack: "Golden hour", lieu: "Sidi Bou Said", days: 7, hour: 17, durationH: 2, statut: "CONFIRMEE", equipe: 1 },
  { titre: "Pharma congress coverage", type: "Corporate event", pack: "Half day", lieu: "Palais des Congrès, Tunis", days: 10, hour: 9, durationH: 6, statut: "CONFIRMEE", equipe: 1 },
  { titre: "Maternity portraits", type: "Portrait", pack: "Studio portrait", lieu: "ReFrame studio, Tunis", days: 13, hour: 11, durationH: 2, statut: "EN_ATTENTE_CONFIRMATION", equipe: 1 },
  { titre: "Wedding — Hammamet garden", type: "Wedding", pack: "Essential", lieu: "Hammamet garden hotel", days: 16, hour: 15, durationH: 8, statut: "CONFIRMEE", equipe: 2 },
  { titre: "School graduation event", type: "Corporate event", lieu: "Université de Tunis", days: 19, hour: 10, durationH: 4, statut: "DEMANDE_RECUE" },
  { titre: "Brand identity portraits", type: "Portrait", lieu: "ReFrame studio, Tunis", days: 22, hour: 10, durationH: 3, statut: "CONFIRMEE", equipe: 1 },
  { titre: "Engagement — countryside", type: "Engagement", pack: "Golden hour", lieu: "Beja countryside", days: 25, hour: 16, durationH: 3, statut: "CONFIRMEE", equipe: 1 },
  { titre: "Product launch — fashion", type: "Corporate event", pack: "Half day", lieu: "Centre Culturel Tunis", days: 28, hour: 18, durationH: 4, statut: "EN_ATTENTE_CONFIRMATION" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The stats seed cannot run in production.");
  }
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("ADMIN_EMAIL is not set.");

  // Read accounts
  const [admin, client, photographers] = await Promise.all([
    Utilisateur.findOne({ email: adminEmail, role: "ADMIN" })
      .select("_id nom prenom")
      .lean<{ _id: Types.ObjectId; nom: string; prenom: string }>(),
    Utilisateur.findOne({ role: "CLIENT" })
      .sort({ createdAt: 1 })
      .select("_id nom prenom")
      .lean<{ _id: Types.ObjectId; nom: string; prenom: string }>(),
    Utilisateur.find({ role: "PHOTOGRAPHE", statut: "ACTIF" })
      .sort({ createdAt: 1 })
      .limit(3)
      .select("_id nom prenom")
      .lean<{ _id: Types.ObjectId; nom: string; prenom: string }[]>(),
  ]);

  if (!admin) throw new Error("No ADMIN found for ADMIN_EMAIL. Run seed:admin first.");
  if (!client) throw new Error("No CLIENT account found. Create one by signing up in the app first.");

  console.log(`Admin: ${admin.prenom} ${admin.nom}`);
  console.log(`Client: ${client.prenom} ${client.nom}`);
  console.log(`Photographers available: ${photographers.length}`);

  // Ensure catalogue exists (creates it if seed:demo hasn't run yet)
  console.log("Ensuring catalogue (event types + packs)…");
  const { typeIds, packIds } = await ensureCatalogue();
  console.log(`  Types: ${[...typeIds.keys()].join(", ")}`);
  console.log(`  Packs: ${[...packIds.keys()].join(", ")}`);

  // Remove previous stats seed
  const old = await Seance.find({ notes: { $regex: `^\\${SEED_TAG}` } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  if (old.length > 0) {
    const oldIds = old.map((s) => s._id);
    await Tache.deleteMany({ seance: { $in: oldIds } });
    await Seance.deleteMany({ _id: { $in: oldIds } });
    console.log(`Removed ${old.length} previous seed:stats sessions.`);
  }

  // Create sessions
  let created = 0;
  let skipped = 0;

  for (const spec of SESSIONS) {
    const typeId = typeIds.get(spec.type);
    if (!typeId) {
      console.warn(`  SKIP: type "${spec.type}" not found`);
      skipped++;
      continue;
    }

    const packId = spec.pack ? packIds.get(spec.pack) : undefined;
    if (spec.pack && !packId) {
      console.warn(`  SKIP: pack "${spec.pack}" not found`);
      skipped++;
      continue;
    }

    // Build team — cycle through available photographers
    const equipe: { employe: Types.ObjectId; role: string }[] = [];
    const wantedCount = spec.equipe ?? 0;
    if (photographers.length > 0 && wantedCount > 0) {
      const roles = ["PHOTOGRAPHE_PRINCIPAL", "SECOND_PHOTOGRAPHE", "VIDEASTE"] as const;
      for (let i = 0; i < Math.min(wantedCount, photographers.length); i++) {
        const idx = (created + i) % photographers.length;
        equipe.push({ employe: photographers[idx]._id, role: roles[i] ?? roles[0] });
      }
    }

    const dateDebut = at(spec.days, spec.hour);
    const dateFin = new Date(dateDebut.getTime() + spec.durationH * HOUR);

    const doc: Record<string, unknown> = {
      titre: spec.titre,
      client: client._id,
      typeEvenement: typeId,
      dateDebut,
      dateFin,
      lieu: spec.lieu,
      statut: spec.statut,
      equipe,
      notes: `${SEED_TAG} ${spec.type.toLowerCase()}`,
    };
    if (packId) {
      doc.pack = packId;
    } else {
      doc.prestationPersonnalisee = "Custom photography service";
    }
    if (spec.prixFinal !== undefined) doc.prixFinal = spec.prixFinal;
    if (spec.nombreReports !== undefined) doc.nombreReports = spec.nombreReports;

    await Seance.create(doc);
    created++;
  }

  // Summary by status
  const byStatus = new Map<string, number>();
  for (const s of SESSIONS) {
    byStatus.set(s.statut, (byStatus.get(s.statut) ?? 0) + 1);
  }

  const byType = new Map<string, number>();
  for (const s of SESSIONS) {
    byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
  }

  const past = SESSIONS.filter((s) => s.days < 0).length;
  const future = SESSIONS.filter((s) => s.days >= 0).length;

  console.log(`\nCreated ${created} sessions (${skipped} skipped).`);
  console.log(`  Past: ${past} | Upcoming: ${future}`);
  console.log(
    `  By type: ${[...byType.entries()].map(([k, v]) => `${k} ×${v}`).join(", ")}`,
  );
  console.log(
    `  By status: ${[...byStatus.entries()].map(([k, v]) => `${k} ×${v}`).join(", ")}`,
  );
  console.log(
    `\nNow open /dashboard/statistiques to see the data across all 5 periods.`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
