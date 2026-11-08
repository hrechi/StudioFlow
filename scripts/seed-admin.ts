/**
 * npm run seed:admin
 * Creates or reconciles the ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD (.env or .env.local).
 * Staff accounts are then created by the admin in /dashboard/utilisateurs/nouveau.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Notification } from "../src/modules/utilisateurs/notification.model";
import { hashPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";
import { emailSchema, passwordSchema } from "../src/modules/utilisateurs/utilisateur.schemas";

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");
  if (!email.success) throw new Error("ADMIN_EMAIL is missing or invalid in .env.local");
  if (!password.success) {
    throw new Error(
      `ADMIN_PASSWORD is invalid: ${password.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  await connectDB();
  await Promise.all([Utilisateur.init(), Notification.init()]); // builds indexes (unique email)

  const existingAdmin = await Utilisateur.findOne({ role: "ADMIN" }).select("+motDePasse").lean();
  if (existingAdmin) {
    const sameEmail = existingAdmin.email === email.data;
    await Utilisateur.updateOne(
      { _id: existingAdmin._id },
      {
        $set: {
          email: email.data,
          motDePasse: await hashPassword(password.data),
          statut: "ACTIF",
        },
      },
    );
    console.log(
      `✔ Admin reconciled: ${email.data}${sameEmail ? "" : ` (email updated from ${existingAdmin.email})`} (database "${mongoose.connection.name}")`,
    );
    return;
  }

  const sameEmail = await Utilisateur.findOne({ email: email.data }).lean();
  if (sameEmail) {
    throw new Error(
      `A ${sameEmail.role} account already uses ${email.data}. Choose another ADMIN_EMAIL.`,
    );
  }

  const admin = await Utilisateur.create({
    prenom: "Admin",
    nom: "ReFrame",
    email: email.data,
    motDePasse: await hashPassword(password.data),
    role: "ADMIN",
    statut: "ACTIF",
    specialite: "Studio management",
  });

  await Notification.create({
    utilisateur: admin._id,
    titre: "Welcome to ReFrame",
    message: "Your administrator account is ready. Create the accounts of the studio staff.",
    type: "COMPTE",
    lienCible: "/dashboard/utilisateurs/nouveau",
  });

  console.log(`✔ Admin created: ${admin.email} (database "${mongoose.connection.name}")`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
