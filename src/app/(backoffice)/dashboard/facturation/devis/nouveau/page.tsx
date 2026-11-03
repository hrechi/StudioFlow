/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { listFacturationSessions } from "@/modules/facturation/facturation.integrations";
import { DevisEditor } from "@/modules/facturation/components/devis-editor";

export const metadata: Metadata = { title: "New quote" };

export default async function NouveauDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ seance?: string }>;
}) {
  await requireArea("facturation");
  const [{ seance }, seances] = await Promise.all([searchParams, listFacturationSessions()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/facturation/devis"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Quotes
          </Link>
        }
        title="New quote"
        description="Add the services or let the AI suggest a quote from the session type and past pricing."
      />
      <DevisEditor seances={seances} defaultSeanceId={seance} />
    </div>
  );
}
