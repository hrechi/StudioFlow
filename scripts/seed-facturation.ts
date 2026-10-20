import { connectDB } from "@/lib/db";
import { Devis } from "@/modules/facturation/devis.model";

if (process.env.NODE_ENV === "production") {
  throw new Error("The facturation seed cannot run in production.");
}

await connectDB();
console.log(`Facturation seed is ready; existing quotes: ${await Devis.countDocuments()}.`);
