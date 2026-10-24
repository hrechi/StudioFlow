/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { DevisEditor } from "@/modules/facturation/components/devis-editor";
import { getDevis, NotFoundError } from "@/modules/facturation/devis.service";
import { listFacturationSessions } from "@/modules/facturation/facturation.integrations";

export const metadata: Metadata = { title: "Edit quote" };

export default async function ModifierDevisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireArea("facturation");
  const { id } = await params;
  const devis = await getDevis(id, user).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  // Only drafts are editable: a sent quote must be taken back to draft first.
  if (devis.statut !== "BROUILLON") redirect(`/dashboard/facturation/devis/${id}`);
  const seances = await listFacturationSessions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/dashboard/facturation/devis/${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {devis.numero}
          </Link>
        }
        title={`Edit ${devis.numero}`}
        description="Only drafts can be edited. Changes are not visible to the client until you send the quote."
      />
      <DevisEditor seances={seances} devis={devis} />
    </div>
  );
}
