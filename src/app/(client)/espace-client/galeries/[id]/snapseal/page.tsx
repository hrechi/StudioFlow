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
import { DeliveryDownloads } from "@/modules/snapseal/components/delivery-downloads";
import { SnapSealNotConfigured } from "@/modules/snapseal/components/snapseal-parts";
import { syncGalerieProof } from "@/modules/snapseal/snapseal.guards";
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
  let seal = config ? await getGalerieSeal(galerie.id, config.registryAddress) : null;
  if (config && seal?.livraison && !seal.deliveredAt) {
    // A delivery published but not checked yet: look at the chain once.
    try {
      await syncGalerieProof(galerie.id);
      seal = await getGalerieSeal(galerie.id, config.registryAddress);
    } catch {
      // Chain unreachable: the download stays locked until it can be checked.
    }
  }
  const deliveryAvailable =
    !!seal?.livraison && !!seal.deliveredAt && seal.deliveryHash === seal.livraison.hash;
  const allPhotos = await listPhotosOfGalerie(galerie.id);
  const visibleIds = new Set(
    allPhotos.filter((photo) => photo.statutCulling !== "REJETEE").map((photo) => photo.id),
  );
  const byId = new Map(allPhotos.map((p) => [p.id, p]));
  const deliveredPhotos =
    deliveryAvailable && seal?.livraison
      ? seal.livraison.photoIds.flatMap((photoId) => byId.get(photoId) ?? [])
      : [];

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
      {deliveredPhotos.length > 0 && seal?.livraison && (
        <DeliveryDownloads
          galerieId={galerie.id}
          photos={deliveredPhotos}
          zipSize={seal.livraison.taille}
        />
      )}
      {!config ? (
        <SnapSealNotConfigured />
      ) : seal ? (
        <ClientPanel
          config={config}
          galerieId={galerie.id}
          required={galerie.preuveBlockchainRequise}
          deliveryAvailable={deliveryAvailable}
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
