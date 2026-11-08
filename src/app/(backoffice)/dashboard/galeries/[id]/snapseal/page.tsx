/* Module : SnapSeal (blockchain proof of a gallery's selection and delivery) */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";
import { PhotographerPanel } from "@/modules/snapseal/components/photographer-panel";
import { SnapSealNotConfigured } from "@/modules/snapseal/components/snapseal-parts";
import { getGalerieSeal, getSnapSealConfig } from "@/modules/snapseal/snapseal.service";

export const metadata: Metadata = { title: "Blockchain proof" };

export default async function GalerieSnapSealPage({
  params,
}: PageProps<"/dashboard/galeries/[id]/snapseal">) {
  await requireArea("photos-galeries");
  const { id } = await params;
  const galerie = await getGalerieById(id);
  if (!galerie) notFound();

  const config = getSnapSealConfig();
  const seal = config ? await getGalerieSeal(galerie.id, config.registryAddress) : null;
  const sealedIds = new Set(seal?.photos.map((photo) => photo.photoId));
  const unsealedPhotos = seal
    ? (await listPhotosOfGalerie(galerie.id)).filter(
        (photo) => photo.statutCulling !== "REJETEE" && !sealedIds.has(photo.id),
      ).length
    : 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/galeries/${galerie.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {galerie.titre}
      </Link>
      <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase">
        Blockchain proof
      </h1>
      {config ? (
        <PhotographerPanel
          config={config}
          galerieId={galerie.id}
          galerieShared={galerie.statut !== "EN_TRI"}
          seal={seal}
          unsealedPhotos={unsealedPhotos}
        />
      ) : (
        <SnapSealNotConfigured />
      )}
    </div>
  );
}
