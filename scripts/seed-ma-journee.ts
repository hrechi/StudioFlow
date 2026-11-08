/**
 * npm run seed:journee      (after seed:all: needs the inventory, the event types and the packs)
 *
 * A photographer's day to try "My day" (Équipement → Today) on a phone:
 *   - the account Ines Haddad · photographe.journee@reframe.test (PHOTOGRAPHE);
 *   - this morning: studio portraits, in progress, 3 items out to return one by one;
 *   - this evening: a wedding with a full brief, 4 confirmed items to pack and 1 to confirm;
 *   - yesterday: a product shoot whose light is still out (an overdue return);
 *   - her tasks of the day (one already done).
 *
 * Sessions and tasks are created through the Séances services (createSeance, setSeanceStatut,
 * createTache), like the app does. Reservations belong to this module (Matériel).
 * Dates are relative to today, in Tunis time. Idempotent: everything tagged "[seed:journee]" is
 * removed and created again, so the day can be reset at any time.
 *
 * Safety: writes only to the local demo database `reframe` (checked before anything is written).
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/lib/db";
import { bornesJour } from "../src/modules/materiel/journee.types";
import { Materiel } from "../src/modules/materiel/materiel.model";
import type { StatutReservation } from "../src/modules/materiel/materiel.types";
import { ReservationMateriel } from "../src/modules/materiel/reservation-materiel.model";
import { listPacks } from "../src/modules/seances/pack.service";
import { Seance } from "../src/modules/seances/seance.model";
import { createSeance, listSeances, setSeanceStatut } from "../src/modules/seances/seance.service";
import { createTache, deleteTachesOfSeance } from "../src/modules/seances/tache.service";
import { listTypesEvenement } from "../src/modules/seances/type-evenement.service";
import { hashPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const BASE_AUTORISEE = "reframe";
const TAG = "[seed:journee]";
const EMAIL = "photographe.journee@reframe.test";
const MOT_DE_PASSE = "MyDay2026";
const SECOND = "photographer@reframe.test";
const CLIENT = "client.amira@reframe.test";
const HEURE = 3_600_000;

/** Tunis time today (or another day) at hh:mm, as a Date. */
function aTunis(jours: number, h: number, m = 0): Date {
  const { debut } = bornesJour(new Date(Date.now() + jours * 24 * HEURE));
  return new Date(debut.getTime() + (h * 60 + m) * 60_000);
}

function verifierBase() {
  const uri = process.env.MONGODB_URI ?? "";
  const nom = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).pathname.replace(/^\//, "");
  if (nom !== BASE_AUTORISEE) {
    throw new Error(`MONGODB_URI points to the database "${nom || "(none)"}": this script only writes to "${BASE_AUTORISEE}". Nothing was written.`);
  }
}

/** Items free over the period, picked by serial number, else the first free item of the category. */
async function choisirMateriel(voulus: { serie: string; categorie: string }[], debut: Date, fin: Date, deja: Set<string>) {
  const occupes = new Set(
    (await ReservationMateriel.find({ statut: { $in: ["EN_ATTENTE", "CONFIRMEE", "EN_COURS"] }, dateDebut: { $lt: fin }, dateFin: { $gt: debut } }).select("materiel").lean()).map((r) =>
      r.materiel.toString(),
    ),
  );
  const libres = await Materiel.find({ archive: { $ne: true }, disponible: true, etat: { $ne: "EN_PANNE" } }).lean();
  const choix: typeof libres = [];
  for (const v of voulus) {
    const ok = (m: (typeof libres)[number]) => !occupes.has(m._id.toString()) && !deja.has(m._id.toString());
    const item = libres.find((m) => m.numeroSerie === v.serie && ok(m)) ?? libres.find((m) => m.categorie === v.categorie && ok(m));
    if (!item) continue;
    deja.add(item._id.toString());
    choix.push(item);
  }
  return choix;
}

async function main() {
  verifierBase();
  await connectDB();
  console.log(`✔ Database: ${mongoose.connection.db?.databaseName}`);

  // ── The photographer ───────────────────────────────────────────────────────
  const ines = await Utilisateur.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        prenom: "Ines",
        nom: "Haddad",
        email: EMAIL,
        role: "PHOTOGRAPHE",
        specialite: "Weddings and portraits",
        telephone: "+216 55 300 400",
        motDePasse: await hashPassword(MOT_DE_PASSE),
        statut: "ACTIF",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true },
  ).lean();
  if (!ines) throw new Error("The photographer account could not be created.");
  const inesId = ines._id.toString();
  const second = await Utilisateur.findOne({ email: SECOND, statut: "ACTIF" }).lean();
  const client = await Utilisateur.findOne({ email: CLIENT }).lean();

  // ── Reset the previous demo day ────────────────────────────────────────────
  const anciennes = (await listSeances({ employeId: inesId })).filter((s) => s.notes?.startsWith(TAG));
  for (const s of anciennes) {
    await deleteTachesOfSeance(s.id);
    await ReservationMateriel.deleteMany({ seance: new Types.ObjectId(s.id) });
  }
  // Finished sessions cannot be deleted through the service (by design): the seed removes its own.
  await Seance.deleteMany({ _id: { $in: anciennes.map((s) => new Types.ObjectId(s.id)) } });

  const types = await listTypesEvenement();
  const type = (slug: string) => {
    const t = types.find((x) => x.slug === slug);
    if (!t) throw new Error(`Event type "${slug}" not found. Run npm run seed:all first.`);
    return t;
  };
  const pack = async (slug: string) => (await listPacks({ typeId: type(slug).id, statut: "PUBLIE" }))[0];

  const commun = { clientId: "", clientNom: "", clientTelephone: "", clientEmail: "", packId: "", prestationPersonnalisee: "", lieuId: "" };

  // ── Yesterday: product shoot, finished, one light never came back ──────────
  const hier = await createSeance({
    ...commun,
    titre: "Atelier Médina — new collection packshots",
    clientNom: "Atelier Médina",
    clientTelephone: "+216 71 456 789",
    clientEmail: "contact@ateliermedina.tn",
    typeEvenementId: type("product").id,
    prestationPersonnalisee: "40 packshots on white + 10 styled scenes",
    dateDebut: aTunis(-1, 14).toISOString(),
    dateFin: aTunis(-1, 18).toISOString(),
    lieu: "ReFrame studio, Tunis",
    statut: "CONFIRMEE",
    equipe: [{ employeId: inesId, role: "PHOTOGRAPHE_PRINCIPAL" }],
    notes: `${TAG} White seamless, two heads, tethered to the laptop.`,
  });
  await setSeanceStatut(hier.id, "EN_COURS");
  await setSeanceStatut(hier.id, "TERMINEE");

  // ── This morning: studio portraits, in progress ────────────────────────────
  const matin = await createSeance({
    ...commun,
    titre: "Yasmine B. — studio portraits",
    clientNom: "Yasmine Ben Romdhane",
    clientTelephone: "+216 98 765 432",
    clientEmail: "yasmine.br@mail.tn",
    typeEvenementId: type("portrait").id,
    packId: (await pack("portrait"))?.id ?? "",
    prestationPersonnalisee: (await pack("portrait")) ? "" : "Studio portrait, 1 hour, 10 retouched photos",
    dateDebut: aTunis(0, 9).toISOString(),
    dateFin: aTunis(0, 12).toISOString(),
    lieu: "ReFrame studio B, Les Berges du Lac",
    statut: "CONFIRMEE",
    equipe: [{ employeId: inesId, role: "PHOTOGRAPHE_PRINCIPAL" }],
    notes: `${TAG} LinkedIn + personal branding. Grey and black backdrops, soft key light at 45°.\nShe will bring 3 outfits; keep 10 min for the change.`,
  });
  await setSeanceStatut(matin.id, "EN_COURS");

  // ── This evening: the wedding ──────────────────────────────────────────────
  const packMariage = await pack("wedding");
  const soir = await createSeance({
    ...commun,
    titre: "Sarah & Adam — wedding",
    ...(client
      ? { clientId: client._id.toString() }
      : { clientNom: "Sarah Mansour", clientTelephone: "+216 22 123 456", clientEmail: "sarah.adam@mail.tn" }),
    typeEvenementId: type("wedding").id,
    packId: packMariage?.id ?? "",
    prestationPersonnalisee: packMariage ? "" : "Full day coverage, 400 photos, highlight film",
    dateDebut: aTunis(0, 16).toISOString(),
    dateFin: aTunis(0, 23, 30).toISOString(),
    lieu: "Dar El Marsa, La Marsa",
    statut: "CONFIRMEE",
    equipe: [{ employeId: inesId, role: "PHOTOGRAPHE_PRINCIPAL" }, ...(second ? [{ employeId: second._id.toString(), role: "SECOND_PHOTOGRAPHE" as const }] : [])],
    notes: `${TAG} 16:00 getting ready (bride's suite, 2nd floor) · 17:30 first look in the garden · 18:30 ceremony · 20:00 dinner and speeches · 22:00 first dance.\nMust-have: rings close-up, both grandmothers, the zaffa entrance. No flash during the ceremony.`,
  });

  // ── Equipment ──────────────────────────────────────────────────────────────
  const deja = new Set<string>();
  const reserver = async (seanceId: string, titre: string, typeNom: string, statut: StatutReservation, debut: Date, fin: Date, voulus: { serie: string; categorie: string }[]) => {
    const items = await choisirMateriel(voulus, debut, fin, deja);
    await ReservationMateriel.insertMany(
      items.map((m) => ({ materiel: m._id, seance: new Types.ObjectId(seanceId), seanceTitre: titre, typeEvenement: typeNom, utilisateur: ines._id, dateDebut: debut, dateFin: fin, statut, seed: true })),
    );
    return items.map((m) => m.nom);
  };

  const enRetard = await reserver(hier.id, "Atelier Médina — new collection packshots", "Product", "EN_COURS", aTunis(-1, 13), aTunis(-1, 19), [
    { serie: "B10XP-2104452", categorie: "ECLAIRAGE" },
  ]);
  const dehors = await reserver(matin.id, "Yasmine B. — studio portraits", "Portrait", "EN_COURS", aTunis(0, 8, 30), aTunis(0, 13), [
    { serie: "6032417", categorie: "APPAREIL_PHOTO" },
    { serie: "1813327", categorie: "OBJECTIF" },
    { serie: "OCF-OCTA90-0417", categorie: "ECLAIRAGE" },
  ]);
  const aEmballer = await reserver(soir.id, "Sarah & Adam — wedding", "Wedding", "CONFIRMEE", aTunis(0, 15), aTunis(0, 23, 59), [
    { serie: "032021003871", categorie: "APPAREIL_PHOTO" },
    { serie: "4512003389", categorie: "OBJECTIF" },
    { serie: "2311001577", categorie: "OBJECTIF" },
    { serie: "AD2P2-24C10552", categorie: "ECLAIRAGE" },
  ]);
  const aConfirmer = await reserver(soir.id, "Sarah & Adam — wedding", "Wedding", "EN_ATTENTE", aTunis(0, 15), aTunis(0, 23, 59), [
    { serie: "1581F6Z9C24A0035", categorie: "ACCESSOIRE" },
  ]);

  // ── Her tasks of the day ───────────────────────────────────────────────────
  const tache = (seanceId: string, titre: string, h: number, m: number, priorite: "BASSE" | "NORMALE" | "HAUTE", phase: "AVANT" | "PENDANT" | "APRES", statut: "A_FAIRE" | "TERMINEE" = "A_FAIRE") =>
    createTache({ seanceId, titre, description: "", employeId: inesId, dateLimite: aTunis(0, h, m).toISOString(), priorite, phase, statut });
  await tache(matin.id, "Set up the grey backdrop and the key light", 8, 45, "NORMALE", "AVANT", "TERMINEE");
  await tache(matin.id, "Send 3 preview photos to Yasmine", 13, 0, "NORMALE", "APRES");
  await tache(soir.id, "Call the bride to confirm the getting-ready address", 12, 30, "HAUTE", "AVANT");
  await tache(soir.id, "Charge all batteries and format the cards", 14, 0, "HAUTE", "AVANT");
  await tache(soir.id, "Shoot the first look in the garden", 17, 30, "NORMALE", "PENDANT");

  console.log(`✔ Photographer: Ines Haddad · ${EMAIL}`);
  console.log(`✔ Yesterday, still out (overdue): ${enRetard.join(", ") || "none free"}`);
  console.log(`✔ This morning, to return one by one: ${dehors.join(", ")}`);
  console.log(`✔ This evening, to pack: ${aEmballer.join(", ")} · to confirm: ${aConfirmer.join(", ") || "none free"}`);
  console.log("✔ 5 tasks today (1 done). Sign in and open Equipment → Today.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ My day seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
