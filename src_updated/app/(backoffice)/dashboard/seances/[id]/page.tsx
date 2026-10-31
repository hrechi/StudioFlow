/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft, FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/guards";
import { STATUTS_SEANCE_FACTURABLES } from "@/modules/facturation/facturation.integrations";
import { PrixFinalCard } from "@/modules/seances/components/prix-final-card";
import { SeanceForm } from "@/modules/seances/components/seance-form";
import { listLieuxRefs } from "@/modules/seances/lieu.service";
import { listPacks } from "@/modules/seances/pack.service";
import { statutSeanceReelConfig } from "@/modules/seances/seance.dto";
import { findSeanceById } from "@/modules/seances/seance.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";
import { listClientRefs, listPhotographeRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "Edit session" };

export default async function ModifierSeancePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const seance = await findSeanceById(id);
  if (!seance) notFound();
  const [clients, photographes, types, packs, lieux] = await Promise.all([
    listClientRefs(),
    listPhotographeRefs(),
    listTypesEvenement(),
    listPacks(),
    listLieuxRefs(),
  ]);
  const locked = seance.statut === "TERMINEE" || seance.statut === "ANNULEE";

  // Statuts pour lesquels le prix final est pertinent
  const STATUTS_PRIX = ["CONFIRMEE", "EN_COURS", "TERMINEE", "REPORTEE"] as const;
  const showPrixFinal = STATUTS_PRIX.includes(seance.statut as (typeof STATUTS_PRIX)[number]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/seances" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            Sessions
          </Link>
        }
        title={seance.titre}
        actions={
          seance.client && STATUTS_SEANCE_FACTURABLES.includes(seance.statut) ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/facturation/devis/nouveau?seance=${seance.id}`}>
                <FilePlus2 aria-hidden />
                Create quote
              </Link>
            </Button>
          ) : undefined
        }
        description={
          <span className="flex items-center gap-2">
            <StatusBadge value={seance.statut} config={statutSeanceReelConfig} />
            {locked && <span>Final status: this session is read-only.</span>}
          </span>
        }
      />
      {seance.messageClient && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
          <span className="block text-xs font-medium text-muted-foreground">Message from the client</span>
          {seance.messageClient}
        </p>
      )}
      {showPrixFinal && (
        <PrixFinalCard
          seanceId={seance.id}
          statut={seance.statut}
          prixPack={seance.pack?.prix}
          prixFinal={seance.prixFinal}
        />
      )}
      {!locked && (
        <SeanceForm
          seance={seance}
          clients={clients}
          photographes={photographes}
          lieux={lieux}
          types={types.filter((t) => t.actif || t.id === seance.typeEvenement.id).map((t) => ({ id: t.id, nom: t.nom }))}
          packs={packs.map((p) => ({ id: p.id, nom: p.nom, typeId: p.typeEvenement.id, disabled: p.statut === "DESACTIVE" }))}
        />
      )}
    </div>
  );
}
