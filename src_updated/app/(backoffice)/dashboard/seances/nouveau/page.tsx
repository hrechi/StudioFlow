/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { SeanceForm } from "@/modules/seances/components/seance-form";
import { listLieuxRefs } from "@/modules/seances/lieu.service";
import { listPacks } from "@/modules/seances/pack.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";
import { listClientRefs, listPhotographeRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "New session" };

export default async function NouvelleSeancePage() {
  await requireRole("ADMIN");
  const [clients, photographes, types, packs, lieux] = await Promise.all([
    listClientRefs(),
    listPhotographeRefs(),
    listTypesEvenement(),
    listPacks(),
    listLieuxRefs(),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/seances" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            Sessions
          </Link>
        }
        title="New session"
        description="Team conflicts are checked when you save."
      />
      <SeanceForm
        clients={clients}
        photographes={photographes}
        lieux={lieux}
        types={types.filter((t) => t.actif).map((t) => ({ id: t.id, nom: t.nom }))}
        packs={packs.map((p) => ({ id: p.id, nom: p.nom, typeId: p.typeEvenement.id, disabled: p.statut === "DESACTIVE" }))}
      />
    </div>
  );
}
