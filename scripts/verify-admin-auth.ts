import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { verifyPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";
import {
  emailSchema,
  passwordSchema,
} from "../src/modules/utilisateurs/utilisateur.schemas";

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");

  if (!email.success)
    throw new Error("ADMIN_EMAIL is missing or invalid in .env");
  if (!password.success) {
    throw new Error(
      `ADMIN_PASSWORD is invalid: ${password.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  await connectDB();
  const admin = await Utilisateur.findOne({ email: email.data, role: "ADMIN" })
    .select("+motDePasse")
    .lean();
  const valid = await verifyPassword(password.data, admin?.motDePasse ?? "");

  if (!admin || !valid || admin.statut !== "ACTIF") {
    throw new Error(
      admin?.statut === "BLOQUE"
        ? `Admin account ${email.data} is blocked`
        : `Admin authentication failed for ${email.data}`,
    );
  }

  const connection = mongoose.connection;
  console.log(
    `Database: ${connection.host}:${connection.port}/${connection.name}; role=${admin.role}; status=${admin.statut}`,
  );
  console.log(`✔ Admin authentication verified for ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      "✖ Admin authentication verification failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
