"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  deliveryContract,
  explainChainError,
  readOnlyProvider,
  registryContract,
  sha256File,
  shorten,
} from "../snapseal.chain";
import type { GalerieSealDTO, SealedPhoto, SnapSealConfig } from "../snapseal.types";
import { SealSection, SealTimeline, WalletCard } from "./snapseal-parts";
import { useSnapSeal } from "./use-snapseal";

type VerifyResult = { tone: "success" | "danger"; message: string };

/** Client screens of the fiche: "Choose my photos" and "Tracking and reception". */
export function ClientPanel({
  config,
  seal,
  photos,
}: {
  config: SnapSealConfig;
  seal: GalerieSealDTO;
  photos: SealedPhoto[]; // sealed photos the client can still see
}) {
  const { address, chain, chainError, busy, connect, run } = useSnapSeal(config, seal.onChainId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | null>(null);

  const selected = new Set(chain?.selectionHashes ?? []);
  const hasSelection = !!chain?.selectedAt;

  const togglePhoto = (hash: string) => {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  };

  async function verifyFile(file: File | undefined) {
    setVerify(null);
    if (!file) return;
    try {
      const hash = await sha256File(file);
      if (chain?.deliveryHash === hash) {
        setVerify({ tone: "success", message: "This file matches the published delivery." });
      } else if (selected.has(hash)) {
        setVerify({
          tone: "success",
          message: "This file is a photo of your validated selection.",
        });
      } else if (
        await registryContract(config, readOnlyProvider(config)).isPhotoInGallery(
          seal.onChainId,
          hash,
        )
      ) {
        setVerify({ tone: "success", message: "This file is an original photo of the gallery." });
      } else {
        setVerify({
          tone: "danger",
          message: "No match: this file differs from everything published for this gallery.",
        });
      }
    } catch (error) {
      toast.error(explainChainError(error));
    }
  }

  return (
    <div className="space-y-4">
      <WalletCard
        address={address}
        expected={chain?.client}
        expectedLabel="client"
        networkName={config.networkName}
        onConnect={connect}
      />
      {chainError && <p className="text-sm text-destructive-text">{chainError}</p>}
      <SealTimeline chain={chain} />

      <SealSection title={hasSelection ? "My validated selection" : "Choose my photos"}>
        {!hasSelection && (
          <p className="text-sm text-muted-foreground">
            Click the photos to keep. After validation, the selection is final.
          </p>
        )}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos
            .filter((photo) => !hasSelection || selected.has(photo.hash))
            .map((photo) => {
              const isPicked = hasSelection || picked.has(photo.hash);
              return (
                <li key={photo.hash}>
                  <button
                    type="button"
                    disabled={hasSelection}
                    onClick={() => togglePhoto(photo.hash)}
                    aria-pressed={isPicked}
                    aria-label={`Select ${photo.nomFichier}`}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-lg ring-offset-2",
                      isPicked && "ring-3 ring-primary",
                    )}
                  >
                    <SafeImage
                      src={`/api/photos/${photo.photoId}/miniature`}
                      alt=""
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                    {isPicked && (
                      <CheckCircle2
                        className="absolute top-1.5 right-1.5 size-5 rounded-full bg-success text-white"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
        {hasSelection ? (
          <Button
            variant="outline"
            disabled={busy || !address}
            onClick={() =>
              run("Selection changed", async (signer) => {
                const tx = await registryContract(config, signer).submitSelection(
                  seal.onChainId,
                  chain?.selectionHashes.slice(0, 1) ?? [],
                );
                await tx.wait();
              })
            }
          >
            Try to change my selection
          </Button>
        ) : (
          <Button
            disabled={busy || !address || picked.size === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {busy
              ? "Waiting for the blockchain…"
              : `Validate my selection (${picked.size} of ${photos.length})`}
          </Button>
        )}
      </SealSection>

      {chain?.deliveryHash && (
        <SealSection title="Reception">
          <p className="text-xs break-all text-muted-foreground">
            Published delivery fingerprint: {chain.deliveryHash}
          </p>
          {chain.confirmedAt ? (
            <p className="text-sm text-success-text">You confirmed the reception.</p>
          ) : (
            <Button
              disabled={busy || !address}
              onClick={() =>
                run("Reception confirmed on the blockchain", async (signer) => {
                  const tx = await deliveryContract(config, signer).confirmReception(
                    seal.onChainId,
                  );
                  await tx.wait();
                })
              }
            >
              {busy ? "Waiting for the blockchain…" : "Confirm the reception"}
            </Button>
          )}
        </SealSection>
      )}

      <SealSection title="Verify a received file">
        <p className="text-sm text-muted-foreground">
          The fingerprint is computed in your browser and the file is not uploaded.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="snapseal-verify-file">File to verify</Label>
          <Input
            id="snapseal-verify-file"
            type="file"
            disabled={!chain}
            onChange={(e) => verifyFile(e.target.files?.[0])}
          />
        </div>
        {verify && (
          <p
            role="status"
            className={cn(
              "text-sm",
              verify.tone === "success" ? "text-success-text" : "text-destructive-text",
            )}
          >
            {verify.message}
          </p>
        )}
      </SealSection>

      {chain && (
        <p className="text-xs text-muted-foreground">
          On-chain gallery #{seal.onChainId}, published by{" "}
          <code>{shorten(chain.photographer)}</code>.
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Validate ${picked.size} photo${picked.size > 1 ? "s" : ""} on the blockchain?`}
        description="MetaMask will ask you to sign. After that, nobody can change this selection, including you."
        confirmLabel="Validate and sign"
        onConfirm={() => {
          setConfirmOpen(false);
          void run("Selection validated on the blockchain", async (signer) => {
            const tx = await registryContract(config, signer).submitSelection(seal.onChainId, [
              ...picked,
            ]);
            await tx.wait();
          });
        }}
      />
    </div>
  );
}
