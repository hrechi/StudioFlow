"use client";

import { isAddress, type JsonRpcSigner } from "ethers";
import { Download, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Galerie, Photo } from "@/modules/photos-galeries/galerie.types";
import {
  askClientWalletAction,
  buildDeliveryAction,
  prepareSealAction,
  recordSealAction,
  syncProofAction,
} from "../snapseal.actions";
import { deliveryContract, registryContract, shorten } from "../snapseal.chain";
import type { GalerieSealDTO, LivraisonDTO, SnapSealConfig } from "../snapseal.types";
import { DeliveryPicker } from "./delivery-picker";
import { ExplorerLink, SealSection, SealTimeline, WalletCard } from "./snapseal-parts";
import { useSnapSeal } from "./use-snapseal";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Photographer screens: seal the gallery, see the client's choice, publish the delivery. */
export function PhotographerPanel({
  config,
  galerie,
  seal,
  photos,
  clientWallet,
  unsealedPhotos,
}: {
  config: SnapSealConfig;
  galerie: Galerie;
  seal: GalerieSealDTO | null;
  photos: Photo[];
  clientWallet: string | null; // linked wallet (required galleries), read on the server
  unsealedPhotos: number;
}) {
  const router = useRouter();
  const required = galerie.preuveBlockchainRequise;
  const { address, chain, chainError, busy, connect, run } = useSnapSeal(
    config,
    seal?.onChainId ?? null,
  );
  const [pastedWallet, setPastedWallet] = useState("");
  // The transaction succeeded but recording it failed: retry without paying again.
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [package_, setPackage] = useState<LivraisonDTO | null>(seal?.livraison ?? null);
  const [building, startBuilding] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [asking, startAsking] = useTransition();

  const targetWallet = required ? clientWallet : pastedWallet.trim();
  const targetValid = !!targetWallet && isAddress(targetWallet);

  async function record(txHash: string) {
    const result = await recordSealAction({ galerieId: galerie.id, txHash });
    if (!result.ok) {
      setPendingTx(txHash);
      throw new Error(`Sealed on-chain, but not recorded: ${result.error}`);
    }
    setPendingTx(null);
    router.refresh();
  }

  async function createOnChain(signer: JsonRpcSigner) {
    const prepared = await prepareSealAction(galerie.id);
    if (!prepared.ok) throw new Error(prepared.error);
    const tx = await registryContract(config, signer).createGallery(
      targetWallet,
      prepared.data.map((photo) => photo.hash),
    );
    await tx.wait();
    // The server reads the receipt itself: nothing else is sent.
    await record(tx.hash);
  }

  async function sync() {
    const result = await syncProofAction(galerie.id);
    if (!result.ok) throw new Error(result.error);
    router.refresh();
  }

  if (!seal) {
    return (
      <div className="space-y-4">
        <WalletCard
          address={address}
          expectedLabel="photographer"
          networkName={config.networkName}
          onConnect={connect}
        />
        <SealSection title="Seal this gallery">
          <p className="text-sm text-muted-foreground">
            Publishes the SHA-256 fingerprint of each visible photo. The photos themselves stay in
            Reframe.
          </p>
          {required ? (
            <p className="text-sm text-muted-foreground">
              This gallery requires a blockchain proof: it can be shared with the client only once
              sealed, and its photos, client and step are locked afterwards.
            </p>
          ) : (
            galerie.statut === "EN_TRI" && (
              <p className="text-sm text-warning-text">
                The client can only choose photos once this gallery is shared with them.
              </p>
            )
          )}

          {required ? (
            clientWallet ? (
              <p className="text-sm">
                Sealed for the client&apos;s linked wallet{" "}
                <code className="text-xs">{shorten(clientWallet)}</code>.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg bg-warning/10 p-3">
                <p className="flex items-start gap-2 text-sm text-warning-text">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {galerie.client.prenom} hasn&apos;t linked a wallet to their account yet. They
                  link it once, from their profile; the seal then uses it.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={asking}
                  onClick={() =>
                    startAsking(async () => {
                      const result = await askClientWalletAction(galerie.id);
                      if (result.ok) toast.success("The client has been asked to link a wallet.");
                      else toast.error(result.error);
                    })
                  }
                >
                  <Send aria-hidden />
                  Ask {galerie.client.prenom} to link a wallet
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="snapseal-client-wallet">Client wallet address</Label>
              <Input
                id="snapseal-client-wallet"
                value={pastedWallet}
                onChange={(e) => setPastedWallet(e.target.value)}
                placeholder="0x…"
                autoComplete="off"
              />
            </div>
          )}

          {pendingTx ? (
            <Button
              disabled={busy}
              onClick={() => run("Gallery sealed", async () => record(pendingTx))}
            >
              Retry recording the seal
            </Button>
          ) : (
            <Button
              disabled={busy || !address || !targetValid}
              onClick={() => run("Gallery sealed on the blockchain", createOnChain)}
            >
              {busy ? "Waiting for the blockchain…" : "Publish the gallery on the blockchain"}
            </Button>
          )}
        </SealSection>
      </div>
    );
  }

  // Live chain state first; the facts saved by the server otherwise.
  const selectionHashes = new Set(
    (chain?.selectionHashes.length ? chain.selectionHashes : seal.selectedHashes).map((h) =>
      h.toLowerCase(),
    ),
  );
  const hasSelection = !!chain?.selectedAt || !!seal.selectionAt;
  const selectedPhotos = seal.photos.filter((p) => selectionHashes.has(p.hash.toLowerCase()));
  const selectedPhotoIds = new Set(selectedPhotos.map((p) => p.photoId));
  const onChainDelivery = chain?.deliveryHash ?? seal.deliveryHash ?? null;
  const mismatch =
    !!onChainDelivery &&
    !!package_ &&
    onChainDelivery.toLowerCase() !== package_.hash.toLowerCase();
  const photoById = new Map(photos.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <WalletCard
        address={address}
        expected={chain?.photographer}
        expectedLabel="photographer"
        networkName={config.networkName}
        onConnect={connect}
      />
      {chainError && <p className="text-sm text-destructive-text">{chainError}</p>}
      <SealTimeline chain={chain} />

      <SealSection title={`On-chain gallery #${seal.onChainId}`}>
        <p className="text-sm">
          {seal.photos.length} fingerprints sealed
          {chain && (
            <>
              {" "}
              for client <code className="text-xs">{shorten(chain.client)}</code>
            </>
          )}
          .
        </p>
        {required && galerie.statut === "EN_TRI" && (
          <p className="text-sm text-muted-foreground">
            Sealed: you can now{" "}
            <Link href={`/dashboard/galeries/${galerie.id}`} className="text-primary-text hover:underline">
              share the gallery with the client
            </Link>
            .
          </p>
        )}
        {unsealedPhotos > 0 && (
          <p className="text-sm text-warning-text">
            {unsealedPhotos} visible photo{unsealedPhotos > 1 ? "s are" : " is"} not sealed (added
            after sealing, or an identical copy) and won&apos;t appear in the on-chain selection.
          </p>
        )}
        {config.explorerUrl ? (
          <ExplorerLink href={`${config.explorerUrl}/tx/${seal.txHash}`}>
            View the transaction on Etherscan
          </ExplorerLink>
        ) : (
          <p className="text-xs break-all text-muted-foreground">Transaction: {seal.txHash}</p>
        )}
      </SealSection>

      <SealSection title="Photos to deliver">
        {hasSelection ? (
          <>
            <p className="text-sm text-muted-foreground">
              The client validated {selectedPhotos.length} photo
              {selectedPhotos.length === 1 ? "" : "s"} on the blockchain. Retouch them in Photo
              Editing: the edited copies are added to this gallery for the delivery, without being
              shown to the client.
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
              {selectedPhotos.map((p) => (
                <li key={p.photoId}>
                  <Link
                    href={`/dashboard/photos/editeur?photo=${p.photoId}`}
                    className="relative block aspect-square overflow-hidden rounded-lg ring-1 ring-border hover:ring-primary"
                    title={`Retouch ${p.nomFichier}`}
                  >
                    <SafeImage
                      src={photoById.get(p.photoId)?.urlMiniature ?? `/api/photos/${p.photoId}/miniature`}
                      alt={p.nomFichier}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the client to validate their selection on the blockchain.
          </p>
        )}
      </SealSection>

      {hasSelection && !onChainDelivery && (
        <SealSection title="Publish the delivery">
          <p className="text-sm text-muted-foreground">
            Choose the photos to deliver in this gallery. Reframe builds one ZIP, stores it and
            computes its fingerprint; you then publish that fingerprint, and the client downloads
            exactly this file.
          </p>
          <DeliveryPicker
            photos={photos}
            selectedPhotoIds={selectedPhotoIds}
            initialIds={package_?.photoIds}
            busy={building || busy}
            onBuild={(photoIds) =>
              startBuilding(async () => {
                const result = await buildDeliveryAction({ galerieId: galerie.id, photoIds });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setPackage(result.data);
                toast.success("Delivery package ready", {
                  description: `${result.data.photoIds.length} photos · ${formatBytes(result.data.taille)}`,
                });
                router.refresh();
              })
            }
          />
          {package_ && (
            <div className="space-y-2 rounded-lg bg-surface p-3">
              <p className="text-sm font-medium">
                {package_.nomFichier} · {package_.photoIds.length} photos ·{" "}
                {formatBytes(package_.taille)}
              </p>
              <p className="text-xs break-all text-muted-foreground">SHA-256: {package_.hash}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/galeries/${galerie.id}/livraison`} download>
                    <Download aria-hidden />
                    Check the package
                  </a>
                </Button>
                <Button size="sm" disabled={busy || !address} onClick={() => setConfirmOpen(true)}>
                  {busy ? "Waiting for the blockchain…" : "Publish the delivery on the blockchain"}
                </Button>
              </div>
            </div>
          )}
        </SealSection>
      )}

      {onChainDelivery && (
        <SealSection title="Delivery">
          {mismatch ? (
            <p className="flex items-start gap-2 text-sm text-destructive-text">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              The fingerprint on the blockchain doesn&apos;t match the package stored in Reframe, so
              the client can&apos;t download it here.
            </p>
          ) : (
            <p className="text-sm text-success-text">
              Published on the blockchain
              {package_ ? ` · ${package_.photoIds.length} photos, ${formatBytes(package_.taille)}` : ""}.
              {chain?.confirmedAt ? " The client confirmed the reception." : ""}
            </p>
          )}
          <p className="text-xs break-all text-muted-foreground">SHA-256: {onChainDelivery}</p>
          {package_ && (
            <Button asChild size="sm" variant="outline">
              <a href={`/api/galeries/${galerie.id}/livraison`} download>
                <Download aria-hidden />
                Download the delivered package
              </a>
            </Button>
          )}
        </SealSection>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Publish this delivery on the blockchain?"
        description="The contract accepts one delivery only: after this, the package can't be changed. MetaMask will ask you to sign."
        confirmLabel="Publish and sign"
        onConfirm={() => {
          setConfirmOpen(false);
          if (!package_) return;
          void run("Delivery published on the blockchain", async (signer) => {
            const tx = await deliveryContract(config, signer).publishDelivery(
              seal.onChainId,
              package_.hash,
            );
            await tx.wait();
            await sync(); // the server checks the on-chain hash against the stored package
          });
        }}
      />
    </div>
  );
}
