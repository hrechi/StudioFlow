/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { LieuForm } from "@/modules/seances/components/lieu-form";
import { listLieuxRefs } from "@/modules/seances/lieu.service";

export const metadata: Metadata = { title: "New location" };

export default async function NouveauLieuPage({
  searchParams,
}: {
  searchParams: Promise<{
    nom?: string;
    adresse?: string;
    latitude?: string;
    longitude?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const autres = await listLieuxRefs();
  const params = await searchParams;

  // Valeurs pré-remplies depuis le LocationPicker (bouton "Save as location")
  const prefill = params.nom
    ? {
        nom: params.nom,
        adresse: params.adresse ?? "",
        latitude: params.latitude ?? "",
        longitude: params.longitude ?? "",
      }
    : undefined;

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
        title="New location"
        description={
          prefill
            ? `Pre-filled from OpenStreetMap — "${prefill.nom}"`
            : "Outdoor locations need coordinates so the weather can be checked."
        }
      />
      <LieuForm autres={autres} prefill={prefill} />
    </div>
  );
}
