"use client";

import { isAddress, type JsonRpcSigner } from "ethers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prepareSealAction, recordSealAction } from "../snapseal.actions";
import {
  deliveryContract,
  explainChainError,
  registryContract,
  sha256File,
  shorten,
} from "../snapseal.chain";
import type { GalerieSealDTO, SealedPhoto, SnapSealConfig } from "../snapseal.types";
import { ExplorerLink, SealSection, SealTimeline, WalletCard } from "./snapseal-parts";
import { useSnapSeal } from "./use-snapseal";

type PendingRecord = { onChainId: number; txHash: string; photos: SealedPhoto[] };

/** Photographer screens of the fiche: "Create a gallery" and "Publish the delivery". */
export function PhotographerPanel({
  config,
  galerieId,
  galerieShared,
  seal,
  unsealedPhotos,
}: {
  config: SnapSealConfig;
  galerieId: string;
  galerieShared: boolean;
  seal: GalerieSealDTO | null;
  unsealedPhotos: number;
}) {
  const router = useRouter();
  const { address, chain, chainError, busy, connect, run } = useSnapSeal(
    config,
    seal?.onChainId ?? null,
  );
  const [clientWallet, setClientWallet] = useState("");
  // The transaction succeeded but saving the link failed: retry without paying again.
  const [pendingRecord, setPendingRecord] = useState<PendingRecord | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<{ name: string; hash: string } | null>(null);
  const clientWalletValid = isAddress(clientWallet.trim());

  async function saveRecord(record: PendingRecord) {
    const result = await recordSealAction({ galerieId, ...record });
    if (!result.ok) {
      setPendingRecord(record);
      throw new Error(`Sealed as #${record.onChainId}, but not saved: ${result.error}`);
    }
    setPendingRecord(null);
    router.refresh();
  }

  async function createOnChain(signer: JsonRpcSigner) {
    const prepared = await prepareSealAction(galerieId);
    if (!prepared.ok) throw new Error(prepared.error);

    const registry = registryContract(config, signer);
    const tx = await registry.createGallery(
      clientWallet.trim(),
      prepared.data.map((photo) => photo.hash),
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: { topics: string[]; data: string }) => registry.interface.parseLog(log))
      .find((parsed: { name: string } | null) => parsed?.name === "GalleryCreated");
    if (!event) throw new Error("The gallery number could not be read from the transaction.");

    await saveRecord({
      onChainId: Number(event.args.id),
      txHash: tx.hash,
      photos: prepared.data,
    });
  }

  async function pickDeliveryFile(file: File | undefined) {
    setDeliveryFile(null);
    if (!file) return;
    try {
      setDeliveryFile({ name: file.name, hash: await sha256File(file) });
    } catch (error) {
      toast.error(explainChainError(error));
    }
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
            Reframe, and this gallery works exactly as before.
          </p>
          {!galerieShared && (
            <p className="text-sm text-warning-text">
              The client can only choose photos once this gallery is shared with them.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="snapseal-client-wallet">Client wallet address</Label>
            <Input
              id="snapseal-client-wallet"
              value={clientWallet}
              onChange={(e) => setClientWallet(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
            />
          </div>
          {pendingRecord ? (
            <Button
              disabled={busy}
              onClick={() =>
                run("Gallery sealed", async () => {
                  await saveRecord(pendingRecord);
                })
              }
            >
              Retry saving gallery #{pendingRecord.onChainId}
            </Button>
          ) : (
            <Button
              disabled={busy || !address || !clientWalletValid}
              onClick={() => run("Gallery sealed on the blockchain", createOnChain)}
            >
              {busy ? "Waiting for the blockchain…" : "Publish the gallery on the blockchain"}
            </Button>
          )}
        </SealSection>
      </div>
    );
  }

  const delivered = !!chain?.deliveryHash;
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
      {!delivered && (
        <SealSection title="Publish the delivery">
          <p className="text-sm text-muted-foreground">
            Choose the final file (for example a .zip of the retouched photos), then send your
            client exactly this file. Its fingerprint is computed in your browser and the file is
            not uploaded. The gallery&apos;s &quot;Download all&quot; zip is rebuilt on each
            download, so its fingerprint changes: don&apos;t use it as the delivery file.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="snapseal-delivery-file">Final file</Label>
            <Input
              id="snapseal-delivery-file"
              type="file"
              onChange={(e) => pickDeliveryFile(e.target.files?.[0])}
            />
          </div>
          {deliveryFile && (
            <p className="text-xs break-all text-muted-foreground">
              SHA-256 of {deliveryFile.name}: {deliveryFile.hash}
            </p>
          )}
          <Button
            disabled={busy || !address || !deliveryFile}
            onClick={() =>
              deliveryFile &&
              run("Delivery published on the blockchain", async (signer) => {
                const tx = await deliveryContract(config, signer).publishDelivery(
                  seal.onChainId,
                  deliveryFile.hash,
                );
                await tx.wait();
              })
            }
          >
            {busy ? "Waiting for the blockchain…" : "Publish the delivery on the blockchain"}
          </Button>
        </SealSection>
      )}
    </div>
  );
}
