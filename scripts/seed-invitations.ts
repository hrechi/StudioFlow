/**
 * npm run seed:invitations
 *
 * Creates several unlocked invitation cards for client.amira@reframe.test.
 * This is local/demo data only and is safe to run repeatedly.
 */
import mongoose, { Types } from "mongoose";
import { randomBytes } from "node:crypto";
import { connectDB } from "../src/lib/db";
import { Counter } from "../src/modules/facturation/counter.model";
import { Devis, type IFacture } from "../src/modules/facturation/devis.model";
import { calculerTotaux } from "../src/modules/facturation/facturation.utils";
import { Invitation } from "../src/modules/invitations/invitation.model";
import { appliquerDetails } from "../src/modules/invitations/invitation.linked";
import { TEMPLATES } from "../src/modules/invitations/invitation.templates";
import { contenuSchema } from "../src/modules/invitations/invitation.schema";
import { TITRE_DEVIS_INVITATION, TVA_INVITATION_PAR_DEFAUT } from "../src/modules/invitations/invitation.types";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const CLIENT_EMAIL = "client.amira@reframe.test";
const SEED_TAG = "[seed:invitations]";
const DAY = 86_400_000;

async function nextNumber(prefix: "DEV" | "FAC") {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return `${prefix}-${year}-${String(counter!.value).padStart(4, "0")}`;
}

async function main() {
  await connectDB();
  const [admin, client] = await Promise.all([
    Utilisateur.findOne({ role: "ADMIN", statut: "ACTIF" }).lean(),
    Utilisateur.findOne({ email: CLIENT_EMAIL, role: "CLIENT", statut: "ACTIF" }).lean(),
  ]);
  if (!admin) throw new Error("No active admin found. Run seed:admin first.");
  if (!client) throw new Error(`No active client found for ${CLIENT_EMAIL}. Run seed:facturation first.`);

  await Invitation.deleteMany({ client: client._id, titre: { $regex: `^${SEED_TAG}` } });
  const names = [
    ["Classic gold wedding", "classique", "2027-05-22", "Villa Carthage"],
    ["Blush garden wedding", "floral", "2027-06-12", "Dar Zarrouk, Sidi Bou Said"],
    ["Modern city wedding", "moderne", "2027-09-04", "La Badira, Hammamet"],
    ["Royal night wedding", "royal", "2027-10-16", "Four Seasons Gammarth"],
    ["Zaffa family celebration", "zaffa", "2027-11-06", "Carthage Thalasso"],
  ] as const;

  await Invitation.insertMany(names.map(([name, templateId, date, lieu], index) => {
    const template = TEMPLATES.find((item) => item.id === templateId)!;
    const contenu = appliquerDetails(contenuSchema.parse({
      ...template.contenu,
      details: {
        ...template.contenu.details,
        nomA: index % 2 ? "Youssef" : "Amira",
        nomB: index % 2 ? "Ines" : "Karim",
        date,
        heure: `${18 + (index % 2)}:30`,
        lieu,
      },
    }));
    return {
      client: client._id,
      titre: `${SEED_TAG} ${name}`,
      contenu,
      partage: { token: randomBytes(16).toString("hex"), actif: index < 3 },
    };
  }));

  const existingQuote = await Devis.findOne({
    objet: "INVITATION",
    client: client._id,
    archivedAt: { $exists: false },
  });
  if (!existingQuote) {
    const prixHT = 50_000;
    const totals = calculerTotaux(
      [{ designation: TITRE_DEVIS_INVITATION, quantite: 1, prixUnitaireHT: prixHT }],
      0,
      TVA_INVITATION_PAR_DEFAUT,
    );
    const now = new Date();
    const facture: IFacture = {
      _id: new Types.ObjectId(),
      numero: await nextNumber("FAC"),
      type: "SOLDE",
      montantTTC: totals.montantTTC,
      montantPaye: totals.montantTTC,
      montantRestant: 0,
      dateEmission: now,
      dateEcheance: new Date(now.getTime() + 30 * DAY),
      statut: "PAYEE",
      dateCompletePaiement: now,
      paiements: [{
        montant: totals.montantTTC,
        date: now,
        modePaiement: "VIREMENT",
        reference: "SEED-INVITATION",
        enregistrePar: admin._id,
        createdAt: now,
      }],
    };
    await Devis.create({
      numero: await nextNumber("DEV"),
      objet: "INVITATION",
      client: client._id,
      clientSnapshot: { nom: `${client.prenom} ${client.nom}`, email: client.email },
      seanceSnapshot: { titre: "Wedding invitation editor", type: "Invitation", date: now },
      lignes: [{ designation: TITRE_DEVIS_INVITATION, quantite: 1, prixUnitaireHT: prixHT }],
      remise: 0,
      tva: TVA_INVITATION_PAR_DEFAUT,
      devise: "TND",
      tauxAcompte: 0,
      sousTotal: totals.brut,
      montantHT: totals.montantHT,
      montantTVA: totals.montantTVA,
      montantTTC: totals.montantTTC,
      statut: "ACCEPTE",
      dateEmission: now,
      dateValidite: new Date(now.getTime() + 30 * DAY),
      dateEnvoi: now,
      dateReponse: now,
      genereParIA: false,
      createdBy: admin._id,
      historique: [
        { action: "CREATE", statutApres: "BROUILLON", par: admin._id, date: now },
        { action: "SEND", statutAvant: "BROUILLON", statutApres: "ENVOYE", par: admin._id, date: now },
        { action: "ACCEPT", statutAvant: "ENVOYE", statutApres: "ACCEPTE", par: client._id, date: now },
        { action: "PAYMENT", statutAvant: "ACCEPTE", statutApres: "ACCEPTE", par: admin._id, date: now },
      ],
      factures: [facture],
    });
  }

  console.log(`✔ ${names.length} invitations seeded for ${CLIENT_EMAIL}; first 3 have public links.`);
  console.log(`  Public links are available from the invitation editor after signing in.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Invitation seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
