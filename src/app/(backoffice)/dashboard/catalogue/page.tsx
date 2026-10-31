/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/guards";

export default async function CataloguePage() {
  await requireArea("catalogue");
  redirect("/dashboard/catalogue/packs");
}
