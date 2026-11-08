/* Module : SnapSeal (blockchain proof of a gallery's selection and delivery) */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { getGalerieOfClient } from "@/modules/photos-galeries/galerie.service";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";
import { ClientPanel } from "@/modules/snapseal/components/client-panel";
import { SnapSealNotConfigured } from "@/modules/snapseal/components/snapseal-parts";
import { getGalerieSeal, getSnapSealConfig } from "@/modules/snapseal/snapseal.service";

export const metadata: Metadata = { title: "Blockchain proof" };

export default async function ClientSnapSealPage({
  params,
}: PageProps<"/espace-client/galeries/[id]/snapseal">) {
  const user = await requireArea("espace-client");
  const { id } = await params;
  // Same rule as the gallery page: a client only opens their own, shared galleries.
  const galerie = await getGalerieOfClient(user.id, id);
  if (!galerie) notFound();

  const config = getSnapSealConfig();
  const seal = config ? await getGalerieSeal(galerie.id, config.registryAddress) : null;
  const visibleIds = new Set(
    (await listPhotosOfGalerie(galerie.id))
      .filter((photo) => photo.statutCulling !== "REJETEE")
      .map((photo) => photo.id),
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/espace-client/galeries/${galerie.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {galerie.titre}
      </Link>
      <h1 className="text-3xl font-medium tracking-[0.08em] text-foreground uppercase">
        Blockchain proof
      </h1>
      {!config ? (
        <SnapSealNotConfigured />
      ) : seal ? (
        <ClientPanel
          config={config}
          seal={seal}
          photos={seal.photos.filter((photo) => visibleIds.has(photo.photoId))}
        />
      ) : (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            The studio hasn&apos;t published this gallery on the blockchain yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
