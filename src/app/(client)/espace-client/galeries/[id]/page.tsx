/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ArrowLeft, CalendarClock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatDate } from "@/lib/utils";
import { ClientGallery } from "@/modules/photos-galeries/components/client-gallery";
import { statutGalerieConfig } from "@/modules/photos-galeries/galerie.types";
import { MES_GALERIES, getPhotosOfGalerie } from "@/modules/photos-galeries/mock-data";

export const metadata: Metadata = { title: "My gallery" };

export default async function ClientGaleriePage({
  params,
}: PageProps<"/espace-client/galeries/[id]">) {
  await requireArea("espace-client");
  const { id } = await params;
  // A client only opens their own galleries (the real service filters by client id).
  const galerie = MES_GALERIES.find((g) => g.id === id);
  if (!galerie) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/espace-client/galeries"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My galleries
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={galerie.statut} config={statutGalerieConfig} />
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {galerie.categorie}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-charcoal">{galerie.titre}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            Available until {formatDate(galerie.dateExpiration)}
          </span>
          {galerie.motDePasse && (
            <span className="flex items-center gap-1.5">
              <Lock className="size-4" aria-hidden />
              Private gallery
            </span>
          )}
        </p>
      </header>
      <ClientGallery galerie={galerie} photos={getPhotosOfGalerie(galerie.id)} />
    </div>
  );
}
