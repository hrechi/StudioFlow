/**
 * npm run seed:inventaire
 * Docker: docker compose run --rm seed npx tsx scripts/seed-inventaire.ts
 *
 * The studio's real equipment inventory for the Matériel module: cameras, lenses, lighting,
 * supports and accessories, with brand, model, serial number, purchase date, price (TND,
 * Tunisian retail incl. VAT) and condition. Equipment only: no accounts, sessions or
 * reservations are needed or created (scripts/seed-materiel.ts covers reservation test data).
 *
 * Idempotent: items are upserted by serial number, so running it again updates them and
 * never duplicates. Items added by hand in the app are never touched. Never runs in production.
 *
 * Photos: real product photos from Wikimedia Commons (free licenses, see each file page:
 * https://commons.wikimedia.org/wiki/File:<file name>). Items without a photo of the exact
 * model are left without one, so the app shows its placeholder instead of a wrong product.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Materiel } from "../src/modules/materiel/materiel.model";
import type { CategorieMateriel, EtatMateriel } from "../src/modules/materiel/materiel.types";

// 960 px thumbnails (the size the Commons API serves) and, for small files, the original.
const thumb = (path: string, file: string) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/960px-${file}`;
const original = (path: string, file: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/${path}/${file}`;

type Item = {
  nom: string;
  categorie: CategorieMateriel;
  marque: string;
  modele: string;
  numeroSerie: string;
  etat: EtatMateriel;
  dateAchat: string; // YYYY-MM-DD
  prix: number; // TND
  disponible?: boolean; // default: true unless EN_PANNE
  archive?: boolean;
  photo?: string;
};

const INVENTAIRE: Item[] = [
  // ── Camera bodies ─────────────────────────────────────────────────────────
  {
    nom: "Canon EOS R5 — body A",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS R5",
    numeroSerie: "032021003871",
    etat: "BON",
    dateAchat: "2023-03-14",
    prix: 13900,
    photo: thumb("8/88", "Canon_EOS_R5.jpg"),
  },
  {
    nom: "Canon EOS R5 — body B",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS R5",
    numeroSerie: "032021007405",
    etat: "BON",
    dateAchat: "2023-09-02",
    prix: 13900,
    photo: thumb("8/88", "Canon_EOS_R5.jpg"),
  },
  {
    nom: "Canon EOS R6 Mark II",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS R6 Mark II",
    numeroSerie: "113032000519",
    etat: "NEUF",
    dateAchat: "2025-11-20",
    prix: 9500,
    photo: thumb("5/5a", "Canon_EOS_R6_Mark_II_9_jan_2023a.jpg"),
  },
  {
    nom: "Sony Alpha 7 IV",
    categorie: "APPAREIL_PHOTO",
    marque: "Sony",
    modele: "ILCE-7M4",
    numeroSerie: "5148263",
    etat: "BON",
    dateAchat: "2024-02-08",
    prix: 9200,
    photo: thumb("0/0a", "Sony_Alpha_7_Mark_IV.jpg"),
  },
  {
    nom: "Sony Alpha 7R V",
    categorie: "APPAREIL_PHOTO",
    marque: "Sony",
    modele: "ILCE-7RM5",
    numeroSerie: "6032417",
    etat: "NEUF",
    dateAchat: "2026-01-15",
    prix: 14500,
    photo: thumb("a/a7", "Sony_a7R_V_20230616_162637.jpg"),
  },
  {
    nom: "Nikon Z8",
    categorie: "APPAREIL_PHOTO",
    marque: "Nikon",
    modele: "Z 8",
    numeroSerie: "7011853",
    etat: "BON",
    dateAchat: "2024-06-27",
    prix: 15800,
    photo: thumb("d/d9", "Nikon_Z_8_27_may_2023b.jpg"),
  },
  {
    nom: "Fujifilm GFX100S (medium format)",
    categorie: "APPAREIL_PHOTO",
    marque: "Fujifilm",
    modele: "GFX100S",
    numeroSerie: "1BA04217",
    etat: "BON",
    dateAchat: "2023-05-30",
    prix: 22000,
    photo: thumb(
      "d/d3",
      "2023-08-22_-_Fujifilm_GFX_100S_body_without_lens_-_elevated_frontal_view_--_DSG5461-1_%28HiRes%29.jpg",
    ),
  },
  {
    nom: "Fujifilm X-T5 (backstage / behind the scenes)",
    categorie: "APPAREIL_PHOTO",
    marque: "Fujifilm",
    modele: "X-T5",
    numeroSerie: "3DQ11906",
    etat: "BON",
    dateAchat: "2024-10-05",
    prix: 6200,
    photo: thumb("3/31", "Fujifilm_X-T5_4_nov_2022a.jpg"),
  },
  {
    nom: "Canon EOS 5D Mark IV (retired body)",
    categorie: "APPAREIL_PHOTO",
    marque: "Canon",
    modele: "EOS 5D Mark IV",
    numeroSerie: "092052001246",
    etat: "USE",
    dateAchat: "2019-04-11",
    prix: 8900,
    disponible: false,
    archive: true,
    photo: thumb("7/70", "Canon_EOS_5D_Mark_IV_%28Front%29%2C_1803241116%2C_ako.jpg"),
  },

  // ── Lenses ────────────────────────────────────────────────────────────────
  {
    nom: "Canon RF 24-70mm F2.8L IS USM",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 24-70mm F2.8L IS USM",
    numeroSerie: "4512003389",
    etat: "BON",
    dateAchat: "2023-03-14",
    prix: 9000,
    photo: thumb("3/31", "Canon_EOS_R5_with_Canon_RF_24-70mm_F2.8L_IS_USM_%2850170662581%29.jpg"),
  },
  {
    nom: "Canon RF 70-200mm F2.8L IS USM",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 70-200mm F2.8L IS USM",
    numeroSerie: "6131000842",
    etat: "BON",
    dateAchat: "2023-09-02",
    prix: 10200,
    photo: thumb("9/95", "Canon_RF_70-200mm_F2.8L_IS_USM_Z.jpg"),
  },
  {
    nom: "Canon RF 85mm F1.2L USM",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 85mm F1.2L USM",
    numeroSerie: "2311001577",
    etat: "BON",
    dateAchat: "2023-11-18",
    prix: 10500,
    photo: thumb("9/93", "Canon_R5_mit_RF_85_1.2-8049.jpg"),
  },
  {
    nom: "Canon RF 50mm F1.2L USM",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 50mm F1.2L USM",
    numeroSerie: "1621002093",
    etat: "USE",
    dateAchat: "2022-07-09",
    prix: 9400,
    photo: thumb("a/a0", "Canon_RF_50mm_F1.2L_USM.jpg"),
  },
  {
    nom: "Canon RF 100mm F2.8L Macro IS USM (rings, details)",
    categorie: "OBJECTIF",
    marque: "Canon",
    modele: "RF 100mm F2.8L Macro IS USM",
    numeroSerie: "8101000466",
    etat: "BON",
    dateAchat: "2024-04-22",
    prix: 5200,
    photo: thumb("a/a7", "Canon_RF_100mm_F2.8L_Macro_IS_USM.jpg"),
  },
  {
    nom: "Sony FE 24-70mm F2.8 GM",
    categorie: "OBJECTIF",
    marque: "Sony",
    modele: "SEL2470GM",
    numeroSerie: "1874402",
    etat: "BON",
    dateAchat: "2024-02-08",
    prix: 7400,
    photo: thumb("f/f3", "Sony_FE_24-70mm_F2.8_GM_20230213_141605.jpg"),
  },
  {
    nom: "Sony FE 35mm F1.4 GM",
    categorie: "OBJECTIF",
    marque: "Sony",
    modele: "SEL35F14GM",
    numeroSerie: "1813327",
    etat: "BON",
    dateAchat: "2024-08-16",
    prix: 5600,
    photo: thumb("0/06", "Sony_FE_35mm_F1.4_GM_-_by_Henry_S%C3%B6derlund_%2851090047026%29.jpg"),
  },
  {
    nom: "Sony FE 90mm F2.8 Macro G OSS",
    categorie: "OBJECTIF",
    marque: "Sony",
    modele: "SEL90M28G",
    numeroSerie: "1907751",
    etat: "BON",
    dateAchat: "2025-03-03",
    prix: 4000,
    photo: thumb("5/56", "Sony_FE_90mm_F2.8_Macro_G_OSS_01.jpg"),
  },
  {
    nom: "Sigma 35mm F1.4 DG DN Art (Sony E)",
    categorie: "OBJECTIF",
    marque: "Sigma",
    modele: "35mm F1.4 DG DN | Art",
    numeroSerie: "56128834",
    etat: "BON",
    dateAchat: "2025-05-19",
    prix: 3000,
    photo: thumb(
      "e/e7",
      "Sigma_35mm_F1.4_DG_DN_Art%2C_Sony_E_-_by_Henry_S%C3%B6derlund_%2851193475283%29.jpg",
    ),
  },
  {
    nom: "Nikon NIKKOR Z 24-120mm f/4 S",
    categorie: "OBJECTIF",
    marque: "Nikon",
    modele: "NIKKOR Z 24-120mm f/4 S",
    numeroSerie: "20094415",
    etat: "BON",
    dateAchat: "2024-06-27",
    prix: 4200,
  },
  {
    nom: "Fujinon GF 80mm F1.7 R WR",
    categorie: "OBJECTIF",
    marque: "Fujifilm",
    modele: "GF80mmF1.7 R WR",
    numeroSerie: "2BA00731",
    etat: "BON",
    dateAchat: "2023-05-30",
    prix: 7600,
  },

  // ── Lighting ──────────────────────────────────────────────────────────────
  {
    nom: "Profoto B10X Plus — head 1",
    categorie: "ECLAIRAGE",
    marque: "Profoto",
    modele: "B10X Plus",
    numeroSerie: "B10XP-2104418",
    etat: "BON",
    dateAchat: "2023-04-06",
    prix: 7800,
  },
  {
    nom: "Profoto B10X Plus — head 2",
    categorie: "ECLAIRAGE",
    marque: "Profoto",
    modele: "B10X Plus",
    numeroSerie: "B10XP-2104452",
    etat: "BON",
    dateAchat: "2023-04-06",
    prix: 7800,
  },
  {
    nom: "Profoto A10 on-camera flash",
    categorie: "ECLAIRAGE",
    marque: "Profoto",
    modele: "A10 (Canon)",
    numeroSerie: "A10C-1906331",
    etat: "USE",
    dateAchat: "2022-10-12",
    prix: 3600,
  },
  {
    nom: "Godox AD600 Pro (outdoor strobe)",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "AD600 Pro",
    numeroSerie: "AD6P-21K03187",
    etat: "USE",
    dateAchat: "2022-05-24",
    prix: 3300,
  },
  {
    nom: "Godox AD200 Pro II — pocket flash 1",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "AD200 Pro II",
    numeroSerie: "AD2P2-24C10552",
    etat: "NEUF",
    dateAchat: "2025-09-10",
    prix: 1500,
    photo: thumb("4/4c", "Godox_AD200_Pro_and_AD200_Pro_II.jpg"),
  },
  {
    nom: "Godox AD200 Pro II — pocket flash 2",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "AD200 Pro II",
    numeroSerie: "AD2P2-24C10589",
    etat: "NEUF",
    dateAchat: "2025-09-10",
    prix: 1500,
    photo: thumb("4/4c", "Godox_AD200_Pro_and_AD200_Pro_II.jpg"),
  },
  {
    nom: "Godox V1 speedlight (Canon)",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "V1-C",
    numeroSerie: "V1C-20F07714",
    etat: "EN_PANNE", // fan error after a fall, sent for repair
    dateAchat: "2021-12-03",
    prix: 1050,
    photo: thumb(
      "8/8c",
      "Canon_EOS_R6_Mark_II_with_EF24-105mm_f4L_IS_USM_and_Godox_V1_Flash_20250322161831.jpg",
    ),
  },
  {
    nom: "Aputure LS 600d Pro (continuous LED, video)",
    categorie: "ECLAIRAGE",
    marque: "Aputure",
    modele: "LS 600d Pro",
    numeroSerie: "APT600D-2201388",
    etat: "BON",
    dateAchat: "2024-01-29",
    prix: 6900,
  },
  {
    nom: "Amaran 200x S (bi-colour LED)",
    categorie: "ECLAIRAGE",
    marque: "Aputure",
    modele: "Amaran 200x S",
    numeroSerie: "AM200XS-2305641",
    etat: "EN_PANNE", // flickers at low power, under warranty
    dateAchat: "2025-02-14",
    prix: 1300,
  },
  {
    nom: "Profoto OCF Octa softbox 90 cm",
    categorie: "ECLAIRAGE",
    marque: "Profoto",
    modele: "OCF Octa 3'",
    numeroSerie: "OCF-OCTA90-0417",
    etat: "BON",
    dateAchat: "2023-04-06",
    prix: 1100,
    photo: thumb("f/fc", "Photo_studio_equipment_-_octabox.jpg"),
  },
  {
    nom: "Godox parabolic softbox 120 cm",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "P120L",
    numeroSerie: "P120L-22B0911",
    etat: "BON",
    dateAchat: "2023-06-15",
    prix: 650,
    photo: original("4/41", "Softbox.jpg"),
  },
  {
    nom: "Godox X Pro II wireless trigger",
    categorie: "ECLAIRAGE",
    marque: "Godox",
    modele: "XPro II-C",
    numeroSerie: "XP2C-23H02744",
    etat: "BON",
    dateAchat: "2024-03-11",
    prix: 320,
  },

  // ── Tripods & supports ────────────────────────────────────────────────────
  {
    nom: "Manfrotto 190 tripod + ball head",
    categorie: "TREPIED",
    marque: "Manfrotto",
    modele: "190XPROL + 804RC2",
    numeroSerie: "MT190XPROL-B4471",
    etat: "USE",
    dateAchat: "2021-09-21",
    prix: 1250,
    photo: thumb("2/22", "Manfrotto_190XPROL_%2B_804RC2_%288641876629%29.jpg"),
  },
  {
    nom: "Gitzo Traveler carbon tripod",
    categorie: "TREPIED",
    marque: "Gitzo",
    modele: "GT1541T Traveler",
    numeroSerie: "GT1541T-773019",
    etat: "BON",
    dateAchat: "2023-08-08",
    prix: 3400,
    photo: thumb("1/11", "Gitzo_1541T_Traveler_Carbon_Fiber_Tripod_Front_Angled_Opened.jpg"),
  },
  {
    nom: 'Avenger C-stand 40" kit (×3)',
    categorie: "TREPIED",
    marque: "Avenger",
    modele: "A2040DKIT",
    numeroSerie: "AVA2040-220513",
    etat: "BON",
    dateAchat: "2022-05-13",
    prix: 1450,
    photo: original("b/b9", "C-stand_extended_and_light_P1101.jpeg"),
  },
  {
    nom: "Manfrotto Nano light stands (×4)",
    categorie: "TREPIED",
    marque: "Manfrotto",
    modele: "5001B",
    numeroSerie: "MF5001B-4PK-2306",
    etat: "BON",
    dateAchat: "2023-06-15",
    prix: 780,
  },

  // ── Accessories ───────────────────────────────────────────────────────────
  {
    nom: "DJI Mini 4 Pro drone (Fly More kit)",
    categorie: "ACCESSOIRE",
    marque: "DJI",
    modele: "Mini 4 Pro",
    numeroSerie: "1581F6Z9C24A0035",
    etat: "BON",
    dateAchat: "2025-04-07",
    prix: 4300,
    photo: thumb("9/94", "2024_Dron_DJI_Mini_4_Pro_%2801%29.jpg"),
  },
  {
    nom: "DJI RS 4 Pro gimbal",
    categorie: "ACCESSOIRE",
    marque: "DJI",
    modele: "RS 4 Pro",
    numeroSerie: "6PRSC4F00B0218",
    etat: "NEUF",
    dateAchat: "2026-02-02",
    prix: 3300,
  },
  {
    nom: "Sekonic L-858D light meter",
    categorie: "ACCESSOIRE",
    marque: "Sekonic",
    modele: "L-858D Speedmaster",
    numeroSerie: "SK858D-J10482",
    etat: "BON",
    dateAchat: "2022-03-30",
    prix: 1700,
  },
  {
    nom: "CFexpress Type B 512 GB cards (×4)",
    categorie: "ACCESSOIRE",
    marque: "Transcend",
    modele: "CFexpress 820 512 GB",
    numeroSerie: "TS512GCFE820-4PK",
    etat: "BON",
    dateAchat: "2024-06-27",
    prix: 2400,
    photo: thumb("9/98", "Transcend_Information_CFexpress_card-top_PNr%C2%B00910.jpg"),
  },
  {
    nom: "Peli Air 1535 rolling case",
    categorie: "ACCESSOIRE",
    marque: "Peli",
    modele: "Air 1535",
    numeroSerie: "PELI1535A-21-0906",
    etat: "USE",
    dateAchat: "2021-09-06",
    prix: 1200,
    photo: original("c/c8", "Pelican_Air_1535_Case_%2849069725073%29.jpg"),
  },
  {
    nom: "Monitor calibrator (retouching station)",
    categorie: "ACCESSOIRE",
    marque: "Calibrite",
    modele: "Display Pro HL",
    numeroSerie: "CCDPHL-2311207",
    etat: "BON",
    dateAchat: "2024-11-12",
    prix: 1100,
    photo: thumb("c/cb", "Monitor_Calibration_2010-by-RaBoe-20.jpg"),
  },
  {
    nom: "5-in-1 reflector 107 cm",
    categorie: "ACCESSOIRE",
    marque: "Westcott",
    modele: '5-in-1 42"',
    numeroSerie: "WC-301-2204",
    etat: "USE",
    dateAchat: "2022-04-19",
    prix: 260,
    photo: thumb("0/0f", "Reflector_of_a_professional_wedding_photographer.jpg"),
  },
  {
    nom: "Seamless paper backdrops 2.72 m (white, black, grey)",
    categorie: "ACCESSOIRE",
    marque: "Savage",
    modele: "Widetone 2.72 × 11 m",
    numeroSerie: "SAV-WT272-SET3",
    etat: "BON",
    dateAchat: "2026-03-09",
    prix: 950,
  },
  {
    nom: "Tethering cable 4.6 m (shooting to laptop)",
    categorie: "ACCESSOIRE",
    marque: "Tether Tools",
    modele: "TetherPro USB-C to USB-C",
    numeroSerie: "TT-CUC15-ORG-2402",
    etat: "BON",
    dateAchat: "2024-02-08",
    prix: 190,
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The inventory seed cannot run in production.");
  }
  const serials = INVENTAIRE.map((item) => item.numeroSerie);
  if (new Set(serials).size !== serials.length) throw new Error("Duplicate serial number in seed.");

  await connectDB();
  let created = 0;
  for (const { disponible, archive, photo, dateAchat, ...item } of INVENTAIRE) {
    const result = await Materiel.updateOne(
      { numeroSerie: item.numeroSerie },
      {
        $set: {
          ...item,
          dateAchat: new Date(`${dateAchat}T09:00:00Z`),
          disponible: disponible ?? item.etat !== "EN_PANNE",
          archive: archive ?? false,
          ...(photo ? { photo } : {}),
        },
        ...(photo ? {} : { $unset: { photo: "" } }),
      },
      { upsert: true, runValidators: true },
    );
    if (result.upsertedCount) created++;
  }

  const byCategory = INVENTAIRE.reduce<Record<string, number>>((acc, item) => {
    acc[item.categorie] = (acc[item.categorie] ?? 0) + 1;
    return acc;
  }, {});
  const value = INVENTAIRE.filter((i) => !i.archive).reduce((sum, i) => sum + i.prix, 0);
  console.log(
    `✔ Inventory: ${INVENTAIRE.length} items (${created} new, ${INVENTAIRE.length - created} updated) in database "${mongoose.connection.name}".`,
  );
  console.log(
    `  ${Object.entries(byCategory)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
  );
  console.log(
    `  Active equipment value: ${value.toLocaleString("en-GB")} TND · out of order: ${INVENTAIRE.filter((i) => i.etat === "EN_PANNE").length} · archived: ${INVENTAIRE.filter((i) => i.archive).length}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
