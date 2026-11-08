/**
 * npm run seed:accounts
 *
 * Creates stable local/demo staff accounts used by the full seed.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { hashPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";

const STAFF_PASSWORD = "SeedStaff2026";

const STAFF = [
  {
    prenom: "Nour",
    nom: "Photographe",
    email: "photographer@reframe.test",
    role: "PHOTOGRAPHE" as const,
    specialite: "Wedding and portrait photography",
  },
  {
    prenom: "Sami",
    nom: "Studio",
    email: "manager@reframe.test",
    role: "ADMIN" as const,
    specialite: "Studio operations",
  },
];

async function main() {
  await connectDB();
  const password = await hashPassword(STAFF_PASSWORD);
  for (const account of STAFF) {
    await Utilisateur.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          ...account,
          motDePasse: password,
          statut: "ACTIF",
        },
      },
      { upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }
  console.log(`✔ Staff accounts ready: ${STAFF.map((account) => account.email).join(", ")}`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Account seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
