/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { TachesBrowser } from "@/modules/seances/components/taches-browser";
import { listSeances } from "@/modules/seances/seance.service";
import { listTaches } from "@/modules/seances/tache.service";
import { listPhotographeRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "Tasks" };

export default async function TachesPage() {
  const user = await requireArea("seances");
  const isAdmin = user.role === "ADMIN";
  const [taches, seances, photographes] = await Promise.all([
    listTaches(isAdmin ? {} : { employeId: user.id }),
    isAdmin ? listSeances() : Promise.resolve([]),
    isAdmin ? listPhotographeRefs() : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={isAdmin ? "Preparation, shooting and delivery tasks, by session and by employee." : "Your tasks: update their progress as you go."}
      />
      <TachesBrowser
        taches={taches}
        seances={seances.filter((s) => s.statut !== "ANNULEE").map((s) => ({ id: s.id, titre: s.titre }))}
        photographes={photographes}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
    </div>
  );
}
