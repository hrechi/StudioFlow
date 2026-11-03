/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { formatDateTime } from "@/lib/utils";
import { LieuForm } from "@/modules/seances/components/lieu-form";
import { findLieuById, listLieuxRefs } from "@/modules/seances/lieu.service";

export const metadata: Metadata = { title: "Edit location" };

export default async function ModifierLieuPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const [lieu, refs] = await Promise.all([findLieuById(id), listLieuxRefs()]);
  if (!lieu) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/lieux"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Locations
          </Link>
        }
        title={lieu.nom}
        description={`${lieu.nombreSeances} linked session${lieu.nombreSeances === 1 ? "" : "s"} · updated ${formatDateTime(lieu.updatedAt)}`}
      />
      <LieuForm lieu={lieu} autres={refs.filter((r) => r.id !== lieu.id)} />
    </div>
  );
}
