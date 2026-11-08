/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ArrowLeft, CalendarClock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatDate } from "@/lib/utils";
import {
  ClientGallery,
  type ClientGalleryProof,
} from "@/modules/photos-galeries/components/client-gallery";
import { GuestLinkBox } from "@/modules/photos-galeries/components/guest-link-box";
import { getGalerieOfClient } from "@/modules/photos-galeries/galerie.service";
import {
  categorieGalerieLabels,
  statutGalerieConfig,
} from "@/modules/photos-galeries/galerie.types";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";
import { syncGalerieProof } from "@/modules/snapseal/snapseal.guards";
import { getGalerieSeal, getSnapSealConfig } from "@/modules/snapseal/snapseal.service";

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
  let photos = (await listPhotosOfGalerie(galerie.id)).filter((p) => p.statutCulling !== "REJETEE");

  // SnapSeal, galleries that require a blockchain proof: only the sealed photos are shown (the
  // retouched copies reach the client in the delivery), and the selection is signed on-chain.
  let proof: ClientGalleryProof | undefined;
  const config = galerie.preuveBlockchainRequise ? getSnapSealConfig() : null;
  if (config) {
    let seal = await getGalerieSeal(galerie.id, config.registryAddress);
    if (seal && !seal.selectionAt) {
      // A selection signed earlier but not checked yet (e.g. the tab was closed): look again.
      try {
        await syncGalerieProof(galerie.id);
        seal = await getGalerieSeal(galerie.id, config.registryAddress);
      } catch {
        // Chain unreachable: the page still works, the originals simply stay locked.
      }
    }
    if (seal) {
      const sealedIds = new Set(seal.photos.map((p) => p.photoId));
      photos = photos.filter((p) => sealedIds.has(p.id));
      proof = {
        config,
        onChainId: seal.onChainId,
        clientWallet: seal.clientWallet,
        photoHashes: Object.fromEntries(seal.photos.map((p) => [p.photoId, p.hash])),
        selectedHashes: seal.selectedHashes,
      };
    }
  }

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
          <Link
            href={`/espace-client/galeries/${galerie.id}/snapseal`}
            className="text-primary-text hover:underline"
          >
            Blockchain proof
          </Link>
        </p>
      </header>
      <GuestLinkBox path={galerie.lienAcces} protegee={galerie.protegeeParMotDePasse} />
      {proof && (
        <p className="rounded-lg bg-primary/10 p-3 text-sm text-slate">
          {proof.selectedHashes.length
            ? "Your selection is recorded on the blockchain. Follow the delivery on the Blockchain proof page."
            : "This gallery is protected by a blockchain proof: you see previews now. Choose your photos and approve them with MetaMask (the wallet linked in your profile) to unlock the originals."}
        </p>
      )}
      <ClientGallery galerie={galerie} photos={photos} proof={proof} />
    </div>
  );
}
