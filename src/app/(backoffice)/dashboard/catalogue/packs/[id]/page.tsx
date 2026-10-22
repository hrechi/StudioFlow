/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatDateTime } from "@/lib/utils";
import { PackForm } from "@/modules/seances/components/pack-form";
import { statutPackConfig } from "@/modules/seances/catalogue.types";
import { findPackById } from "@/modules/seances/pack.service";
import { listPrestations } from "@/modules/seances/prestation.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";

export const metadata: Metadata = { title: "Edit pack" };

export default async function ModifierPackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea("catalogue");
  const { id } = await params;
  const [pack, types, prestations] = await Promise.all([
    findPackById(id),
    listTypesEvenement(),
    listPrestations(),
  ]);
  if (!pack) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/catalogue/packs"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Packs
          </Link>
        }
        title={pack.nom}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={pack.statut} config={statutPackConfig} />
            <span>
              {pack.typeEvenement.nom} · updated {formatDateTime(pack.updatedAt)}
            </span>
          </span>
        }
      />
      <PackForm pack={pack} types={types} prestations={prestations} />
    </div>
  );
}
