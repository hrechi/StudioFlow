/**
 * npm run seed:facturation            (add --reset to rebuild the demo sessions and their quotes)
 * Docker: docker compose run --rm seed npx tsx scripts/seed-facturation.ts [--reset]
 *
 * Test data for the Facturation module: event types, services, published packs, client accounts,
 * sessions in every useful status and a few quotes/invoices (draft, sent, accepted with a paid
 * deposit and an overdue balance). Safe to run again: existing records are kept and only what is
 * missing is created. Never runs in production.
 *
 * Client accounts: client.amira@reframe.test, client.youssef@reframe.test, client.sarra@reframe.test
 * Password: SEED_CLIENT_PASSWORD from the environment, else the default below (local test data only).
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { Counter } from "../src/modules/facturation/counter.model";
import { Devis, type IDevis, type IFacture } from "../src/modules/facturation/devis.model";
import { calculerTotaux } from "../src/modules/facturation/facturation.utils";
import { Pack } from "../src/modules/seances/pack.model";
import { Prestation } from "../src/modules/seances/prestation.model";
import { Seance, type ISeance } from "../src/modules/seances/seance.model";
import { TypeEvenement } from "../src/modules/seances/type-evenement.model";
import { hashPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const DEFAULT_CLIENT_PASSWORD = "SeedClient2026";
/** Every seeded session carries this marker in its notes, so --reset only touches demo data. */
const SEED_TAG = "[seed:facturation]";
const DAY = 86_400_000;
const reset = process.argv.includes("--reset");

const TYPES = [
  { nom: "Wedding", slug: "wedding", description: "Ceremony and reception coverage." },
  { nom: "Engagement", slug: "engagement", description: "Couple session before the big day." },
  { nom: "Portrait", slug: "portrait", description: "Studio or outdoor portraits." },
  { nom: "Corporate event", slug: "corporate-event", description: "Conferences, launches and team events." },
];

const PRESTATIONS = [
  { nom: "Lead photographer", unite: "hours" },
  { nom: "Second photographer", unite: "hours" },
  { nom: "Retouched photos (HD)", unite: "photos" },
  { nom: "Private online gallery", unite: "months" },
  { nom: "Printed album 30x30", unite: "album" },
  { nom: "Drone shots", unite: "flight" },
  { nom: "Highlight video", unite: "minutes" },
  { nom: "Studio rental", unite: "hours" },
];

type PackSeed = { type: string; nom: string; prix: number; description: string; lignes: [string, number, string?][]; options?: { nom: string; prix: number }[] };
const PACKS: PackSeed[] = [
  {
    type: "wedding", nom: "Essential", prix: 1800, description: "The day from the ceremony to the first dance.",
    lignes: [["Lead photographer", 8], ["Retouched photos (HD)", 300], ["Private online gallery", 6]],
    options: [{ nom: "Extra hour", prix: 150 }],
  },
  {
    type: "wedding", nom: "Signature", prix: 3200, description: "Two photographers, album and video.",
    lignes: [["Lead photographer", 10], ["Second photographer", 8], ["Retouched photos (HD)", 600], ["Printed album 30x30", 1], ["Highlight video", 5], ["Drone shots", 1, "weather permitting"]],
    options: [{ nom: "Second album for the parents", prix: 450 }],
  },
  {
    type: "engagement", nom: "Golden hour", prix: 450, description: "Outdoor couple session at sunset.",
    lignes: [["Lead photographer", 2], ["Retouched photos (HD)", 40], ["Private online gallery", 3]],
  },
  {
    type: "portrait", nom: "Studio portrait", prix: 280, description: "Individual or family portraits in the studio.",
    lignes: [["Studio rental", 1], ["Lead photographer", 1], ["Retouched photos (HD)", 15]],
  },
  {
    type: "corporate-event", nom: "Half day", prix: 1200, description: "Up to 4 hours of event coverage.",
    lignes: [["Lead photographer", 4], ["Retouched photos (HD)", 150], ["Private online gallery", 12]],
  },
];

const CLIENTS = [
  { prenom: "Amira", nom: "Ben Salem", email: "client.amira@reframe.test", telephone: "+216 20 111 222" },
  { prenom: "Youssef", nom: "Trabelsi", email: "client.youssef@reframe.test", telephone: "+216 22 333 444" },
  { prenom: "Sarra", nom: "Gharbi", email: "client.sarra@reframe.test", telephone: "+216 24 555 666", typeClient: "ENTREPRISE" as const, entreprise: "Gharbi Design" },
];

type SessionSeed = {
  key: string; titre: string; client?: number; type: string; pack?: string;
  jours: number; heures: number; statut: ISeance["statut"]; lieu: string; prixFinal?: number;
};
/** `jours` is relative to today: negative = past. Statuses cover what can and cannot be quoted. */
const SESSIONS: SessionSeed[] = [
  { key: "S1", titre: "Amira & Karim — wedding", client: 0, type: "wedding", pack: "Signature", jours: 45, heures: 10, statut: "CONFIRMEE", lieu: "Dar El Marsa, La Marsa" },
  { key: "S2", titre: "Amira & Karim — engagement", client: 0, type: "engagement", pack: "Golden hour", jours: 12, heures: 2, statut: "CONFIRMEE", lieu: "Sidi Bou Saïd" },
  { key: "S3", titre: "Youssef — family portraits", client: 1, type: "portrait", pack: "Studio portrait", jours: 6, heures: 1, statut: "CONFIRMEE", lieu: "ReFrame studio", prixFinal: 250 },
  { key: "S4", titre: "Gharbi Design — product launch", client: 2, type: "corporate-event", pack: "Half day", jours: 20, heures: 4, statut: "REPORTEE", lieu: "Laico Tunis" },
  { key: "S5", titre: "Youssef & Ines — wedding", client: 1, type: "wedding", pack: "Essential", jours: -10, heures: 8, statut: "TERMINEE", lieu: "Hammamet" },
  { key: "S6", titre: "Sarra — brand portraits", client: 2, type: "portrait", pack: "Studio portrait", jours: 3, heures: 1, statut: "CONFIRMEE", lieu: "ReFrame studio" },
  { key: "S7", titre: "Amira — studio portrait request", client: 0, type: "portrait", pack: "Studio portrait", jours: 30, heures: 1, statut: "DEMANDE_RECUE", lieu: "ReFrame studio" },
  { key: "S8", titre: "Walk-in engagement (no account)", type: "engagement", pack: "Golden hour", jours: 15, heures: 2, statut: "CONFIRMEE", lieu: "Carthage" },
];

function at(days: number, hour = 15): Date {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function nextNumber(prefix: "DEV" | "FAC"): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return `${prefix}-${year}-${String(counter!.value).padStart(4, "0")}`;
}

/**
 * Finds by the same case/accent-insensitive collation as the unique indexes (so an existing
 * "engagement" type is reused, not duplicated), else creates.
 */
async function upsert<T>(model: mongoose.Model<T>, filter: Record<string, unknown>, data: Partial<T>): Promise<Types.ObjectId> {
  const existing = await model.findOne(filter).collation({ locale: "fr", strength: 1 }).select("_id").lean<{ _id: Types.ObjectId }>();
  if (existing) return existing._id;
  const created = await model.create(data);
  return created._id as Types.ObjectId;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("The facturation seed cannot run in production.");
  await connectDB();

  const admin = await Utilisateur.findOne({ role: "ADMIN" }).select("_id email").lean();
  if (!admin) throw new Error("No admin found: run npm run seed:admin first.");

  // ── Catalogue ────────────────────────────────────────────────────────────
  const typeIds = new Map<string, Types.ObjectId>();
  for (const t of TYPES) typeIds.set(t.slug, await upsert(TypeEvenement, { nom: t.nom }, { ...t, actif: true }));

  const prestationIds = new Map<string, Types.ObjectId>();
  for (const p of PRESTATIONS) {
    prestationIds.set(p.nom, await upsert(Prestation, { nom: p.nom }, { ...p, actif: true }));
  }

  const packs = new Map<string, { id: Types.ObjectId; prix: number; seed: PackSeed }>();
  for (const p of PACKS) {
    const typeId = typeIds.get(p.type)!;
    const id = await upsert(Pack, { typeEvenement: typeId, nom: p.nom }, {
      nom: p.nom,
      typeEvenement: typeId,
      description: p.description,
      prix: p.prix,
      afficherPrix: true,
      statut: "PUBLIE",
      prestations: p.lignes.map(([nom, quantite, conditions]) => ({ prestation: prestationIds.get(nom)!, quantite, conditions })),
      options: p.options ?? [],
    });
    packs.set(p.nom, { id, prix: p.prix, seed: p });
  }
  // The pack service keeps packsCount in sync; recompute it since packs were inserted directly.
  for (const id of typeIds.values()) {
    await TypeEvenement.updateOne({ _id: id }, { $set: { packsCount: await Pack.countDocuments({ typeEvenement: id }) } });
  }

  // ── Client accounts ──────────────────────────────────────────────────────
  const password = await hashPassword(process.env.SEED_CLIENT_PASSWORD || DEFAULT_CLIENT_PASSWORD);
  const clients: { id: Types.ObjectId; nom: string; email: string }[] = [];
  for (const c of CLIENTS) {
    const id = await upsert(Utilisateur, { email: c.email }, { ...c, motDePasse: password, role: "CLIENT", statut: "ACTIF", typeClient: c.typeClient ?? "PARTICULIER" });
    clients.push({ id, nom: `${c.prenom} ${c.nom}`, email: c.email });
  }

  // ── Sessions ─────────────────────────────────────────────────────────────
  if (reset) {
    const old = await Seance.find({ notes: { $regex: `^\\${SEED_TAG}` } }).select("_id").lean();
    const ids = old.map((s) => s._id);
    const removed = await Devis.deleteMany({ seance: { $in: ids } });
    await Seance.deleteMany({ _id: { $in: ids } });
    console.log(`↺ Reset: removed ${ids.length} demo sessions and ${removed.deletedCount} quotes.`);
  }

  const sessions = new Map<string, { id: Types.ObjectId; seed: SessionSeed; created: boolean }>();
  for (const s of SESSIONS) {
    const notes = `${SEED_TAG} ${s.key}`;
    const existing = await Seance.findOne({ notes }).select("_id").lean();
    if (existing) {
      sessions.set(s.key, { id: existing._id, seed: s, created: false });
      continue;
    }
    const debut = at(s.jours, s.heures >= 8 ? 10 : 15);
    const created = await Seance.create({
      titre: s.titre,
      client: s.client !== undefined ? clients[s.client].id : undefined,
      clientExterne: s.client === undefined ? { nom: "Mehdi Jaziri", telephone: "+216 98 765 432" } : undefined,
      typeEvenement: typeIds.get(s.type)!,
      pack: s.pack ? packs.get(s.pack)!.id : undefined,
      dateDebut: debut,
      dateFin: new Date(debut.getTime() + s.heures * 3_600_000),
      lieu: s.lieu,
      statut: s.statut,
      equipe: [],
      notes,
      prixFinal: s.prixFinal,
    });
    sessions.set(s.key, { id: created._id, seed: s, created: true });
  }

  // ── Quotes in each state (only for sessions created in this run) ─────────
  const typeName = new Map(TYPES.map((t) => [t.slug, t.nom]));
  async function quote(key: string, statut: IDevis["statut"], extra: (doc: Partial<IDevis>) => void = () => {}) {
    const session = sessions.get(key)!;
    if (!session.created) return null;
    const s = session.seed;
    const pack = packs.get(s.pack!)!;
    const client = clients[s.client!];
    const lignes = [
      { designation: `Pack ${pack.seed.nom} — ${typeName.get(s.type)}`, quantite: 1, prixUnitaireHT: (s.prixFinal ?? pack.prix) * 1000 },
      ...pack.seed.lignes.map(([nom, quantite]) => ({ designation: `${nom} — included`, quantite, prixUnitaireHT: 0 })),
    ];
    const totals = calculerTotaux(lignes, 0, 19);
    const emission = new Date(Date.now() - 20 * DAY);
    const doc: Partial<IDevis> = {
      numero: await nextNumber("DEV"),
      client: client.id,
      seance: session.id,
      clientSnapshot: { nom: client.nom, email: client.email },
      seanceSnapshot: { titre: s.titre, type: typeName.get(s.type), date: at(s.jours) },
      lignes,
      remise: 0,
      tva: 19,
      devise: "TND",
      tauxAcompte: 30,
      sousTotal: totals.brut,
      montantHT: totals.montantHT,
      montantTVA: totals.montantTVA,
      montantTTC: totals.montantTTC,
      statut,
      dateEmission: emission,
      dateValidite: new Date(Date.now() + 10 * DAY),
      genereParIA: false,
      createdBy: admin!._id,
      historique: [{ action: "CREATE", statutApres: "BROUILLON", par: admin!._id, date: emission }],
      factures: [],
    };
    extra(doc);
    return Devis.create(doc);
  }

  const made: string[] = [];
  // S3: draft, ready to edit and send.
  if (await quote("S3", "BROUILLON")) made.push("S3 draft");
  // S2: sent, waiting for the client's answer (log in as Amira to accept it).
  if (await quote("S2", "ENVOYE", (d) => { d.dateEnvoi = new Date(Date.now() - 2 * DAY); d.historique!.push({ action: "SEND", statutAvant: "BROUILLON", statutApres: "ENVOYE", par: admin._id, date: d.dateEnvoi }); })) made.push("S2 sent");
  // S5: accepted with deposit + balance; deposit paid, balance overdue (late-payment risk).
  const s5 = sessions.get("S5")!;
  if (s5.created) {
    const doc = await quote("S5", "ACCEPTE", (d) => {
      d.dateEnvoi = new Date(Date.now() - 19 * DAY);
      d.dateReponse = new Date(Date.now() - 18 * DAY);
      d.planPaiement = "ACOMPTE_SOLDE";
      d.modePaiementPrefere = "VIREMENT";
    });
    if (doc) {
      const acompte = Math.round(doc.montantTTC * 0.3);
      const solde = doc.montantTTC - acompte;
      const factures: IFacture[] = [
        {
          _id: new Types.ObjectId(), numero: await nextNumber("FAC"), type: "ACOMPTE",
          montantTTC: acompte, montantPaye: acompte, montantRestant: 0,
          dateEmission: new Date(Date.now() - 18 * DAY), dateEcheance: new Date(Date.now() - 11 * DAY),
          statut: "PAYEE", dateCompletePaiement: new Date(Date.now() - 14 * DAY),
          paiements: [{ montant: acompte, date: new Date(Date.now() - 14 * DAY), modePaiement: "VIREMENT", reference: "VIR-2026-4471", enregistrePar: admin._id, createdAt: new Date(Date.now() - 14 * DAY) }],
        },
        {
          _id: new Types.ObjectId(), numero: await nextNumber("FAC"), type: "SOLDE",
          montantTTC: solde, montantPaye: 0, montantRestant: solde,
          dateEmission: new Date(Date.now() - 18 * DAY), dateEcheance: new Date(Date.now() - 3 * DAY),
          statut: "EN_RETARD", paiements: [],
        },
      ];
      doc.factures = factures;
      doc.historique.push(
        { action: "SEND", statutAvant: "BROUILLON", statutApres: "ENVOYE", par: admin._id, date: doc.dateEnvoi! },
        { action: "ACCEPT", statutAvant: "ENVOYE", statutApres: "ACCEPTE", par: clients[1].id, date: doc.dateReponse! },
        { action: "INVOICES", statutAvant: "ACCEPTE", statutApres: "ACCEPTE", par: clients[1].id, date: doc.dateReponse! },
        { action: "PAYMENT", statutAvant: "ACCEPTE", statutApres: "ACCEPTE", par: admin._id, date: new Date(Date.now() - 14 * DAY) },
      );
      await doc.save();
      made.push("S5 accepted (deposit paid, balance overdue)");
    }
  }

  const createdCount = [...sessions.values()].filter((s) => s.created).length;
  console.log(`✔ Catalogue: ${TYPES.length} event types, ${PRESTATIONS.length} services, ${PACKS.length} packs.`);
  console.log(`✔ Clients: ${clients.map((c) => c.email).join(", ")}`);
  console.log(`✔ Sessions: ${createdCount} created, ${sessions.size - createdCount} already there.`);
  console.log(made.length ? `✔ Quotes: ${made.join("; ")}.` : "✔ Quotes: none created (sessions already existed; use --reset to rebuild).");
  console.log(`  Database "${mongoose.connection.name}". Quotable now: S1 wedding, S4 product launch, S6 brand portraits.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
