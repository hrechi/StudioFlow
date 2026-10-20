/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ArrowLeft, CalendarClock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatDate } from "@/lib/utils";
import { ClientGallery } from "@/modules/photos-galeries/components/client-gallery";
import { GuestLinkBox } from "@/modules/photos-galeries/components/guest-link-box";
import { getGalerieOfClient } from "@/modules/photos-galeries/galerie.service";
import {
  categorieGalerieLabels,
  statutGalerieConfig,
} from "@/modules/photos-galeries/galerie.types";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = { title: "My gallery" };

export default async function ClientGaleriePage({
  params,
}: PageProps<"/espace-client/galeries/[id]">) {
  const user = await requireArea("espace-client");
  const { id } = await params;
  // A client only opens their own, shared galleries.
  const galerie = await getGalerieOfClient(user.id, id);
  if (!galerie) notFound();
  // Rejected photos are never shown to the client.
  const photos = (await listPhotosOfGalerie(galerie.id)).filter(
    (p) => p.statutCulling !== "REJETEE",
  );

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
            {categorieGalerieLabels[galerie.categorie]}
          </span>
        </div>
        <h1 className="text-3xl font-medium tracking-[0.08em] text-foreground uppercase">
          {galerie.titre}
        </h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            Available until {formatDate(galerie.dateExpiration)}
          </span>
          {galerie.protegeeParMotDePasse && (
            <span className="flex items-center gap-1.5">
              <Lock className="size-4" aria-hidden />
              Private gallery
            </span>
          )}
        </p>
      </header>
      <GuestLinkBox path={galerie.lienAcces} protegee={galerie.protegeeParMotDePasse} />
      <ClientGallery galerie={galerie} photos={photos} />
    </div>
  );
}
