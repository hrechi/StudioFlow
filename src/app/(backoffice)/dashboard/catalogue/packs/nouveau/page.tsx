/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { PackForm } from "@/modules/seances/components/pack-form";
import { listPrestations } from "@/modules/seances/prestation.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";

export const metadata: Metadata = { title: "New pack" };

export default async function NouveauPackPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireArea("catalogue");
  const { type } = await searchParams;
  const [types, prestations] = await Promise.all([listTypesEvenement(), listPrestations()]);

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
        title="New pack"
        description="Start as a draft, then publish when the content and price are final."
      />
      {types.length === 0 || prestations.length === 0 ? (
        <EmptyState
          title="Set up the catalogue first"
          description="You need at least one event type and one service to build a pack."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/catalogue/types">Event types</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/catalogue/prestations">Services</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <PackForm types={types} prestations={prestations} defaultTypeId={type} />
      )}
    </div>
  );
}
