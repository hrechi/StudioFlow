/**
 * npm run seed:galeries      (best after `npm run seed:reservations`, to link the sessions)
 * Docker: docker compose run --rm --build seed npx tsx --conditions=react-server scripts/seed-galeries.ts
 *
 * Client galleries with real photos for the Photos & Galleries module, one per finished
 * session of scripts/seed-reservations.ts, in every pipeline status (culling, shared,
 * approved, delivered). Photos go through the module's own services: stored in GridFS
 * with a WebP thumbnail, then culled (kept / rejected), favourites and a cover photo set.
 *
 * Galleries belong to the existing CLIENT accounts (round-robin); none is created.
 * Idempotent: galleries with the same titles are deleted (with their photos) and recreated.
 * Runs with the `react-server` condition so the module services can be imported.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { MOCK_IMAGES } from "../src/lib/mock-images";
import { Galerie } from "../src/modules/photos-galeries/galerie.model";
import { createGalerie, deleteGalerie } from "../src/modules/photos-galeries/galerie.service";
import type { CategorieGalerie, StatutGalerie } from "../src/modules/photos-galeries/galerie.types";
import { Photo } from "../src/modules/photos-galeries/photo.model";
import { uploadPhoto } from "../src/modules/photos-galeries/photo.service";
import { Seance } from "../src/modules/seances/seance.model";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const DAY = 86_400_000;

type GallerySeed = {
  titre: string; // = session title in seed-reservations.ts (linked when it exists)
  categorie: CategorieGalerie;
  statut: StatutGalerie;
  download: boolean;
  photos: string[];
  prefix: string; // camera-style file names
};

const GALERIES: GallerySeed[] = [
  {
    titre: "Yasmine & Karim — wedding",
    categorie: "MARIAGE",
    statut: "LIVREE",
    download: true,
    photos: MOCK_IMAGES.mariage.slice(0, 8),
    prefix: "R5A_",
  },
  {
    titre: "Maison Jasmin — autumn collection packshots",
    categorie: "PRODUIT",
    statut: "VALIDEE",
    download: true,
    photos: MOCK_IMAGES.produit.slice(0, 6),
    prefix: "GFX_",
  },
  {
    titre: "Nour & Mehdi — engagement at Sidi Bou Saïd",
    categorie: "MARIAGE",
    statut: "PARTAGEE",
    download: false,
    photos: MOCK_IMAGES.mariage.slice(8, 14),
    prefix: "DSC0",
  },
  {
    titre: "Atelier Médina — team portraits",
    categorie: "PORTRAIT",
    statut: "PARTAGEE",
    download: true,
    photos: MOCK_IMAGES.portrait.slice(0, 7),
    prefix: "R6M2_",
  },
  {
    titre: "Carthage Startup Summit 2026",
    categorie: "EVENEMENT",
    statut: "EN_TRI",
    download: false,
    photos: MOCK_IMAGES.evenement.slice(0, 8),
    prefix: "Z8_",
  },
];

async function fetchPhoto(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url.replace("w=1600", "w=1400"), {
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("This seed cannot run in production.");
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const admin =
    (adminEmail && (await Utilisateur.findOne({ email: adminEmail, role: "ADMIN" }).lean())) ||
    (await Utilisateur.findOne({ role: "ADMIN" }).lean());
  if (!admin) throw new Error("No ADMIN account: run `npm run seed:admin` first.");
  const clients = await Utilisateur.find({ role: "CLIENT", statut: "ACTIF" })
    .sort({ createdAt: 1 })
    .lean();
  if (!clients.length)
    throw new Error("No active CLIENT account: sign up a client first (/register).");

  // Replace the previous run (photos and GridFS files are removed by the service).
  const old = await Galerie.find({ titre: { $in: GALERIES.map((g) => g.titre) } })
    .select("_id")
    .lean();
  for (const g of old) await deleteGalerie(g._id.toString());

  // Download everything in parallel first (the slow part).
  const files = await Promise.all(GALERIES.map((g) => Promise.all(g.photos.map(fetchPhoto))));

  let total = 0;
  for (const [index, g] of GALERIES.entries()) {
    const client = clients[index % clients.length];
    const seance = await Seance.findOne({ titre: g.titre }).select("_id").lean();
    const dto = await createGalerie({
      titre: g.titre,
      categorie: g.categorie,
      clientId: client._id.toString(),
      dateExpiration: new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10),
      telechargementAutorise: g.download,
      motDePasse: "",
    });
    await Galerie.updateOne(
      { _id: dto.id },
      { $set: { statut: g.statut, ...(seance ? { seance: seance._id } : {}) } },
    );

    let n = 0;
    for (const data of files[index]) {
      if (!data) continue;
      n++;
      await uploadPhoto(
        dto.id,
        {
          name: `${g.prefix}${String(2400 + n * 17).padStart(4, "0")}.jpg`,
          type: "image/jpeg",
          size: data.length,
          data,
        },
        admin._id.toString(),
      );
    }
    total += n;

    // Culling: every gallery but the one still being sorted has kept / rejected photos.
    const list = await Photo.find({ galerie: dto.id }).sort({ createdAt: 1 }).select("_id").lean();
    const ids = list.map((p) => p._id);
    if (g.statut !== "EN_TRI") {
      await Photo.updateMany(
        { _id: { $in: ids } },
        { $set: { statutCulling: "RETENUE", scoreQualite: 84 } },
      );
      if (ids.length > 2) {
        await Photo.updateOne(
          { _id: ids[ids.length - 1] },
          { $set: { statutCulling: "REJETEE", estFloue: true, scoreQualite: 28 } },
        );
      }
      // Client favourites once the gallery has been shared.
      await Photo.updateMany({ _id: { $in: ids.slice(0, 3) } }, { $set: { estFavori: true } });
    } else {
      await Photo.updateMany(
        { _id: { $in: ids.slice(0, 3) } },
        { $set: { statutCulling: "RETENUE", scoreQualite: 88 } },
      );
    }
    if (ids[0]) await Galerie.updateOne({ _id: dto.id }, { $set: { photoCouverture: ids[0] } });

    console.log(
      `  ${g.statut.padEnd(8)} ${g.titre} — ${n} photos · client ${client.prenom} ${client.nom}${seance ? " · linked to session" : ""}`,
    );
  }
  console.log(
    `✔ ${GALERIES.length} galleries, ${total} photos in "${mongoose.connection.name}" (replaced ${old.length} galleries).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
