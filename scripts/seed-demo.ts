/**
 * npm run seed:demo        (this script, then seed:materiel)
 *
 * Full demo data so the ADMIN sees every module filled in. One studio, one client:
 * - catalogue: event types, services and published packs (same values as seed-facturation.ts);
 * - real `seances` for amel.mediouni@gmail.com (the sessions of scripts/demo-seances.ts);
 * - tasks of the upcoming sessions (Séances module generator), some done, some overdue;
 * - quotes and invoices in several states (draft, sent, accepted / paid / overdue);
 * - galleries with real photos (stored in GridFS by the Photos module) in every status;
 * - a few notifications for the admin and the client.
 *
 * Accounts are only READ by e-mail (ADMIN_EMAIL and the client); none is created or changed.
 * The team of a session is the first active PHOTOGRAPHE if there is one (the Séances module
 * only accepts PHOTOGRAPHE accounts in a team), otherwise the team is left empty.
 *
 * Idempotent: catalogue entries are reused; seeded sessions (notes starting with
 * "[seed:demo]") and their tasks, quotes and galleries are deleted and recreated.
 * Runs with the `react-server` condition so the other modules' services can be called.
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { MOCK_IMAGES } from "../src/lib/mock-images";
import { Counter } from "../src/modules/facturation/counter.model";
import { Devis, type IDevis, type IFacture } from "../src/modules/facturation/devis.model";
import { calculerTotaux } from "../src/modules/facturation/facturation.utils";
import { Galerie } from "../src/modules/photos-galeries/galerie.model";
import { createGalerie, deleteGalerie } from "../src/modules/photos-galeries/galerie.service";
import type { CategorieGalerie, StatutGalerie } from "../src/modules/photos-galeries/galerie.types";
import { Photo } from "../src/modules/photos-galeries/photo.model";
import { uploadPhoto } from "../src/modules/photos-galeries/photo.service";
import { Pack } from "../src/modules/seances/pack.model";
import { Prestation } from "../src/modules/seances/prestation.model";
import { Seance } from "../src/modules/seances/seance.model";
import { Tache } from "../src/modules/seances/tache.model";
import { generateTachesForSeance } from "../src/modules/seances/tache.service";
import { TypeEvenement } from "../src/modules/seances/type-evenement.model";
import { Notification } from "../src/modules/utilisateurs/notification.model";
import { createNotification } from "../src/modules/utilisateurs/notification.service";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";
import type { TypeNotification } from "../src/modules/utilisateurs/utilisateur.types";
import {
  DAY,
  DEMO_CLIENT_EMAIL,
  DEMO_SEANCES,
  HOUR,
  type SeanceDemoSeed,
  type TypeDemo,
} from "./demo-seances";

const SEED_TAG = "[seed:demo]";

// ── Catalogue (same values as scripts/seed-facturation.ts) ──────────────────

const TYPES: { nom: TypeDemo; slug: string; description: string }[] = [
  { nom: "Wedding", slug: "wedding", description: "Ceremony and reception coverage." },
  { nom: "Engagement", slug: "engagement", description: "Couple session before the big day." },
  { nom: "Portrait", slug: "portrait", description: "Studio or outdoor portraits." },
  {
    nom: "Corporate event",
    slug: "corporate-event",
    description: "Conferences, launches and team events.",
  },
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

type PackSeed = {
  type: TypeDemo;
  nom: string;
  prix: number;
  minutes: number;
  description: string;
  lignes: [string, number, string?][];
  options?: { nom: string; prix: number }[];
};
const PACKS: PackSeed[] = [
  {
    type: "Wedding",
    nom: "Essential",
    prix: 1800,
    minutes: 480,
    description: "The day from the ceremony to the first dance.",
    lignes: [
      ["Lead photographer", 8],
      ["Retouched photos (HD)", 300],
      ["Private online gallery", 6],
    ],
    options: [{ nom: "Extra hour", prix: 150 }],
  },
  {
    type: "Wedding",
    nom: "Signature",
    prix: 3200,
    minutes: 600,
    description: "Two photographers, album and video.",
    lignes: [
      ["Lead photographer", 10],
      ["Second photographer", 8],
      ["Retouched photos (HD)", 600],
      ["Printed album 30x30", 1],
      ["Highlight video", 5],
      ["Drone shots", 1, "weather permitting"],
    ],
    options: [{ nom: "Second album for the parents", prix: 450 }],
  },
  {
    type: "Engagement",
    nom: "Golden hour",
    prix: 450,
    minutes: 120,
    description: "Outdoor couple session at sunset.",
    lignes: [
      ["Lead photographer", 2],
      ["Retouched photos (HD)", 40],
      ["Private online gallery", 3],
    ],
  },
  {
    type: "Portrait",
    nom: "Studio portrait",
    prix: 280,
    minutes: 60,
    description: "Individual or team portraits in the studio.",
    lignes: [
      ["Studio rental", 1],
      ["Lead photographer", 1],
      ["Retouched photos (HD)", 15],
    ],
  },
  {
    type: "Corporate event",
    nom: "Half day",
    prix: 1200,
    minutes: 240,
    description: "Up to 4 hours of event coverage.",
    lignes: [
      ["Lead photographer", 4],
      ["Retouched photos (HD)", 150],
      ["Private online gallery", 12],
    ],
  },
];

/** Pack of each demo session (by key); the others use their type's first pack. */
const PACK_OF: Record<string, string> = { p1: "Signature", p6: "Essential", u5: "Signature" };

// ── Quotes, galleries, notifications ────────────────────────────────────────

type DevisPlan = "BROUILLON" | "ENVOYE" | "PAYE" | "SOLDE_EN_RETARD" | "ACOMPTE_PAYE";
const DEVIS: { seance: string; plan: DevisPlan }[] = [
  { seance: "p1", plan: "PAYE" },
  { seance: "p4", plan: "SOLDE_EN_RETARD" },
  { seance: "p6", plan: "PAYE" },
  { seance: "u2", plan: "ACOMPTE_PAYE" },
  { seance: "u5", plan: "ENVOYE" },
  { seance: "u1", plan: "BROUILLON" },
];

/** The project's curated photos (lib/mock-images.ts), 6 per gallery. */
const PHOTO_URLS: Record<CategorieGalerie, string[]> = {
  MARIAGE: MOCK_IMAGES.mariage.slice(0, 6),
  PORTRAIT: MOCK_IMAGES.portrait.slice(0, 6),
  PRODUIT: MOCK_IMAGES.produit.slice(0, 6),
  EVENEMENT: MOCK_IMAGES.evenement.slice(0, 6),
};

const GALERIES: {
  seance: string;
  categorie: CategorieGalerie;
  statut: StatutGalerie;
  download: boolean;
}[] = [
  { seance: "p1", categorie: "MARIAGE", statut: "LIVREE", download: true },
  { seance: "p2", categorie: "PORTRAIT", statut: "VALIDEE", download: true },
  { seance: "p3", categorie: "PORTRAIT", statut: "PARTAGEE", download: false },
  { seance: "p4", categorie: "EVENEMENT", statut: "PARTAGEE", download: true },
  { seance: "p6", categorie: "MARIAGE", statut: "EN_TRI", download: false },
];

type UserLean = {
  _id: Types.ObjectId;
  nom: string;
  prenom: string;
  email: string;
  entreprise?: string;
};

async function nextNumber(prefix: "DEV" | "FAC"): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return `${prefix}-${year}-${String(counter!.value).padStart(4, "0")}`;
}

/** Same lookup as seed-facturation (case/accent-insensitive, like the unique indexes). */
async function upsert<T>(
  model: mongoose.Model<T>,
  filter: Record<string, unknown>,
  data: Partial<T>,
): Promise<Types.ObjectId> {
  const existing = await model
    .findOne(filter)
    .collation({ locale: "fr", strength: 1 })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  if (existing) return existing._id;
  const created = await model.create(data);
  return created._id as Types.ObjectId;
}

/** Downloads one of the project's photos (Unsplash URLs from lib/mock-images.ts). */
async function fetchPhoto(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url.replace("w=1600", "w=1400"), {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed cannot run in production.");
  }
  await connectDB();

  // Accounts: read only, by e-mail.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("ADMIN_EMAIL is not set.");
  const fields = "nom prenom email entreprise";
  const [admin, client, photographe] = await Promise.all([
    Utilisateur.findOne({ email: adminEmail, role: "ADMIN" }).select(fields).lean<UserLean>(),
    Utilisateur.findOne({ email: DEMO_CLIENT_EMAIL, role: "CLIENT" })
      .select(fields)
      .lean<UserLean>(),
    Utilisateur.findOne({ role: "PHOTOGRAPHE", statut: "ACTIF" })
      .sort({ createdAt: 1 })
      .select(fields)
      .lean<UserLean>(),
  ]);
  if (!admin) throw new Error("No ADMIN account for ADMIN_EMAIL: create it first (seed-admin).");
  if (!client)
    throw new Error(`No CLIENT account for ${DEMO_CLIENT_EMAIL}: sign up with it first.`);
  const clientNom = `${client.prenom} ${client.nom}`;

  // 1. Catalogue
  const typeIds = new Map<TypeDemo, Types.ObjectId>();
  for (const t of TYPES) {
    typeIds.set(t.nom, await upsert(TypeEvenement, { nom: t.nom }, { ...t, actif: true }));
  }
  const prestationIds = new Map<string, Types.ObjectId>();
  for (const p of PRESTATIONS) {
    prestationIds.set(p.nom, await upsert(Prestation, { nom: p.nom }, { ...p, actif: true }));
  }
  const packs = new Map<string, { id: Types.ObjectId; seed: PackSeed }>();
  for (const p of PACKS) {
    const typeId = typeIds.get(p.type)!;
    const id = await upsert(
      Pack,
      { typeEvenement: typeId, nom: p.nom },
      {
        nom: p.nom,
        typeEvenement: typeId,
        description: p.description,
        prix: p.prix,
        afficherPrix: true,
        dureeEstimeeMinutes: p.minutes,
        statut: "PUBLIE",
        prestations: p.lignes.map(([nom, quantite, conditions]) => ({
          prestation: prestationIds.get(nom)!,
          quantite,
          conditions,
        })),
        options: p.options ?? [],
      },
    );
    packs.set(p.nom, { id, seed: p });
  }
  for (const id of typeIds.values()) {
    await TypeEvenement.updateOne(
      { _id: id },
      { $set: { packsCount: await Pack.countDocuments({ typeEvenement: id }) } },
    );
  }
  const packFor = (s: SeanceDemoSeed) =>
    packs.get(PACK_OF[s.key] ?? PACKS.find((p) => p.type === s.type)!.nom)!;

  // 2. Remove the previous demo run (sessions + what hangs on them).
  const old = await Seance.find({ notes: { $regex: `^\\${SEED_TAG}` } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  const oldIds = old.map((s) => s._id);
  const oldGaleries = await Galerie.find({ seance: { $in: oldIds } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  for (const g of oldGaleries) await deleteGalerie(g._id.toString());
  const removedDevis = await Devis.deleteMany({ seance: { $in: oldIds } });
  await Tache.deleteMany({ seance: { $in: oldIds } });
  await Seance.deleteMany({ _id: { $in: oldIds } });

  // 3. Real sessions. Requests and cancelled sessions have no team yet; u3 overlaps u2, so
  //    only u2 gets the photographer (the Séances module refuses double bookings).
  const SANS_EQUIPE = new Set(["u3", "u4", "u6"]);
  const seances = new Map<string, { id: Types.ObjectId; seed: SeanceDemoSeed; packNom: string }>();
  for (const s of DEMO_SEANCES) {
    const pack = packFor(s);
    const equipe =
      photographe && !SANS_EQUIPE.has(s.key)
        ? [{ employe: photographe._id, role: "PHOTOGRAPHE_PRINCIPAL" as const }]
        : [];
    const doc = await Seance.create({
      titre: s.titre,
      client: client._id,
      typeEvenement: typeIds.get(s.type)!,
      pack: pack.id,
      dateDebut: s.debut,
      dateFin: new Date(s.debut.getTime() + s.heures * HOUR),
      lieu: s.lieu,
      statut: s.statut,
      equipe,
      notes: `${SEED_TAG} ${s.key}`,
      messageClient:
        s.statut === "DEMANDE_RECUE" || s.statut === "EN_ATTENTE_CONFIRMATION"
          ? "Could you confirm the timing and the number of people to photograph?"
          : undefined,
      prixFinal: s.statut === "TERMINEE" ? pack.seed.prix : undefined,
    });
    seances.set(s.key, { id: doc._id, seed: s, packNom: pack.seed.nom });
  }

  // 4. Tasks of the current and upcoming confirmed sessions (Séances module generator).
  let taches = 0;
  for (const key of ["c1", "u1", "u2", "u5"]) {
    taches += await generateTachesForSeance(seances.get(key)!.id.toString());
  }
  const now = new Date();
  const seededIds = [...seances.values()].map((s) => s.id);
  const passees = await Tache.find({ seance: { $in: seededIds }, dateLimite: { $lt: now } })
    .sort({ dateLimite: 1 })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  // Everything already due is done, except the two most recent ones (shown as overdue).
  const faites = passees.slice(0, Math.max(0, passees.length - 2)).map((t) => t._id);
  await Tache.updateMany({ _id: { $in: faites } }, { $set: { statut: "TERMINEE" } });
  if (photographe) {
    await Tache.updateMany(
      { seance: { $in: seededIds }, phase: "PENDANT" },
      { $set: { employe: photographe._id } },
    );
  }

  // 5. Quotes and invoices
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const devisFaits: string[] = [];
  for (const { seance: key, plan } of DEVIS) {
    const s = seances.get(key)!;
    const pack = packs.get(s.packNom)!.seed;
    const lignes = [
      {
        designation: `Pack ${pack.nom} — ${s.seed.type}`,
        quantite: 1,
        prixUnitaireHT: pack.prix * 1000,
      },
      ...pack.lignes.map(([nom, quantite]) => ({
        designation: `${nom} — included`,
        quantite,
        prixUnitaireHT: 0,
      })),
    ];
    const totals = calculerTotaux(lignes, 0, 19);
    const emission = new Date(Math.min(s.seed.debut.getTime() - 20 * DAY, ago(2).getTime()));
    const doc: Partial<IDevis> = {
      numero: await nextNumber("DEV"),
      client: client._id,
      seance: s.id,
      clientSnapshot: { nom: clientNom, email: client.email },
      seanceSnapshot: { titre: s.seed.titre, type: s.seed.type, date: s.seed.debut },
      lignes,
      remise: 0,
      tva: 19,
      devise: "TND",
      tauxAcompte: 30,
      sousTotal: totals.brut,
      montantHT: totals.montantHT,
      montantTVA: totals.montantTVA,
      montantTTC: totals.montantTTC,
      statut: plan === "BROUILLON" ? "BROUILLON" : plan === "ENVOYE" ? "ENVOYE" : "ACCEPTE",
      dateEmission: emission,
      dateValidite: new Date(emission.getTime() + 30 * DAY),
      genereParIA: false,
      createdBy: admin._id,
      historique: [{ action: "CREATE", statutApres: "BROUILLON", par: admin._id, date: emission }],
      factures: [],
    };
    if (plan !== "BROUILLON") {
      doc.dateEnvoi = new Date(emission.getTime() + DAY);
      doc.historique!.push({
        action: "SEND",
        statutAvant: "BROUILLON",
        statutApres: "ENVOYE",
        par: admin._id,
        date: doc.dateEnvoi,
      });
    }
    if (plan === "PAYE" || plan === "SOLDE_EN_RETARD" || plan === "ACOMPTE_PAYE") {
      doc.dateReponse = new Date(emission.getTime() + 2 * DAY);
      doc.planPaiement = "ACOMPTE_SOLDE";
      doc.modePaiementPrefere = "VIREMENT";
      doc.historique!.push({
        action: "ACCEPT",
        statutAvant: "ENVOYE",
        statutApres: "ACCEPTE",
        par: client._id,
        date: doc.dateReponse,
      });
      const acompte = Math.round(totals.montantTTC * 0.3);
      const solde = totals.montantTTC - acompte;
      const paidAt = new Date(emission.getTime() + 4 * DAY);
      const facture = (
        type: "ACOMPTE" | "SOLDE",
        montant: number,
        echeance: Date,
        payee: boolean,
        payeLe?: Date,
      ): Promise<IFacture> =>
        nextNumber("FAC").then((numero) => ({
          _id: new Types.ObjectId(),
          numero,
          type,
          montantTTC: montant,
          montantPaye: payee ? montant : 0,
          montantRestant: payee ? 0 : montant,
          dateEmission: doc.dateReponse!,
          dateEcheance: echeance,
          statut: payee ? "PAYEE" : echeance < now ? "EN_RETARD" : "EN_ATTENTE",
          dateCompletePaiement: payee ? payeLe : undefined,
          paiements: payee
            ? [
                {
                  montant,
                  date: payeLe!,
                  modePaiement: "VIREMENT",
                  reference: `VIR-${numero.slice(-4)}`,
                  enregistrePar: admin._id,
                  createdAt: payeLe!,
                },
              ]
            : [],
        }));
      const soldeDu = new Date(
        s.seed.debut.getTime() + (plan === "ACOMPTE_PAYE" ? 7 * DAY : 3 * DAY),
      );
      doc.factures = [
        await facture("ACOMPTE", acompte, new Date(emission.getTime() + 9 * DAY), true, paidAt),
        await facture(
          "SOLDE",
          solde,
          soldeDu,
          plan === "PAYE",
          plan === "PAYE" ? new Date(Math.min(soldeDu.getTime(), now.getTime())) : undefined,
        ),
      ];
    }
    await Devis.create(doc);
    devisFaits.push(`${key} ${plan}`);
  }

  // 6. Galleries with real photos (Photos module services: GridFS + thumbnails).
  let photos = 0;
  let manquantes = 0;
  for (const g of GALERIES) {
    const s = seances.get(g.seance)!;
    const dto = await createGalerie({
      titre: s.seed.titre,
      categorie: g.categorie,
      clientId: client._id.toString(),
      dateExpiration: new Date(now.getTime() + 90 * DAY).toISOString().slice(0, 10),
      telechargementAutorise: g.download,
      motDePasse: "",
    });
    await Galerie.updateOne({ _id: dto.id }, { $set: { seance: s.id, statut: g.statut } });
    for (const [i, url] of PHOTO_URLS[g.categorie].entries()) {
      const data = await fetchPhoto(url);
      if (!data) {
        manquantes++;
        continue;
      }
      await uploadPhoto(
        dto.id,
        {
          name: `${g.seance}-${String(i + 1).padStart(2, "0")}.jpg`,
          type: "image/jpeg",
          size: data.length,
          data,
        },
        admin._id.toString(),
      );
      photos++;
    }
    // Culling: sorted galleries keep most photos; the one being sorted is still pending.
    if (g.statut !== "EN_TRI") {
      const list = await Photo.find({ galerie: dto.id })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
      await Photo.updateMany(
        { _id: { $in: list.map((p) => p._id) } },
        { $set: { statutCulling: "RETENUE", scoreQualite: 82 } },
      );
      if (list.length > 1) {
        await Photo.updateOne(
          { _id: list[list.length - 1]._id },
          { $set: { statutCulling: "REJETEE", estFloue: true, scoreQualite: 31 } },
        );
      }
      if (g.statut === "VALIDEE" || g.statut === "LIVREE") {
        await Photo.updateMany(
          { _id: { $in: list.slice(0, 3).map((p) => p._id) } },
          { $set: { estFavori: true } },
        );
      }
    }
  }

  // 7. Notifications (not duplicated across runs).
  const notes: {
    to: Types.ObjectId;
    titre: string;
    message: string;
    type: TypeNotification;
    lien: string;
  }[] = [
    {
      to: admin._id,
      titre: "New session request",
      message: `${clientNom} asked for “Team building day”.`,
      type: "SEANCE",
      lien: "/dashboard/seances",
    },
    {
      to: admin._id,
      titre: "Balance overdue",
      message: "The balance invoice of “Annual gala” is overdue.",
      type: "FACTURATION",
      lien: "/dashboard/facturation/factures",
    },
    {
      to: client._id,
      titre: "Your quote is ready",
      message: "The quote for “Wedding — Gammarth” is waiting for your answer.",
      type: "FACTURATION",
      lien: "/espace-client/factures",
    },
    {
      to: client._id,
      titre: "Session confirmed",
      message: "“Press conference” is confirmed. See you there!",
      type: "SEANCE",
      lien: "/espace-client/seances",
    },
  ];
  let notifs = 0;
  for (const n of notes) {
    if (await Notification.exists({ utilisateur: n.to, titre: n.titre })) continue;
    await createNotification({
      utilisateurId: n.to.toString(),
      titre: n.titre,
      message: n.message,
      type: n.type,
      lienCible: n.lien,
    });
    notifs++;
  }

  console.log(
    `Catalogue: ${TYPES.length} event types, ${PRESTATIONS.length} services, ${PACKS.length} published packs.`,
  );
  console.log(
    `Sessions: ${seances.size} created for ${clientNom} (${old.length} previous demo sessions replaced).`,
  );
  console.log(
    `Team: ${photographe ? `${photographe.prenom} ${photographe.nom} (PHOTOGRAPHE) as lead photographer` : "none (no active PHOTOGRAPHE)"}.`,
  );
  console.log(
    `Tasks: ${taches} generated, ${faites.length} done, ${passees.length - faites.length} overdue.`,
  );
  console.log(
    `Quotes: ${devisFaits.join(", ")} (${removedDevis.deletedCount} previous ones replaced).`,
  );
  console.log(
    `Galleries: ${GALERIES.length} with ${photos} photos${manquantes ? ` (${manquantes} photos could not be downloaded)` : ""}.`,
  );
  console.log(`Notifications: ${notifs} added.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
