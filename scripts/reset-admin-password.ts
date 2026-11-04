import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { hashPassword } from "../src/modules/utilisateurs/password";
import { Utilisateur } from "../src/modules/utilisateurs/utilisateur.model";
import { emailSchema, passwordSchema } from "../src/modules/utilisateurs/utilisateur.schemas";

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");

  if (!email.success) throw new Error("ADMIN_EMAIL is missing or invalid in .env");
  if (!password.success) {
    throw new Error(
      `ADMIN_PASSWORD is invalid: ${password.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  await connectDB();
  const result = await Utilisateur.updateOne(
    { email: email.data, role: "ADMIN" },
    { $set: { motDePasse: await hashPassword(password.data) } },
  );

  if (result.matchedCount === 0) {
    throw new Error(`No ADMIN account found for ${email.data}`);
  }

  console.log(`✔ Password reset for ${email.data}`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Password reset failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
