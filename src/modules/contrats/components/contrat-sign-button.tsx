"use client";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Bouton de signature client : accepter/refuser + co-signature MetaMask (optionnelle).
 */
import { ExternalLink, Wallet, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { repondreContratAction } from "../contrat.actions";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function ContratSignButton({ contratId }: { contratId: string }) {
  const [isPending, startTransition] = useTransition();
  const [refusOpen, setRefusOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [metaMaskAvailable, setMetaMaskAvailable] = useState<boolean | null>(null);

  // Détection MetaMask après le montage (window n'existe pas côté serveur)
  useEffect(() => {
    setMetaMaskAvailable(typeof window !== "undefined" && !!window.ethereum);
  }, []);

  async function connectMetaMask() {
    if (!window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = accounts[0] ?? null;
      if (addr) setWalletAddress(addr);
    } catch {
      setError("MetaMask connection was refused. You can still sign without it.");
    }
  }

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await repondreContratAction(contratId, {
        accepter: true,
        clientWallet: walletAddress ?? undefined,
      });
      if (!res.ok) setError(res.error);
      // revalidatePath dans l'action rafraîchit la page côté serveur
    });
  }

  function decline() {
    setError(null);
    startTransition(async () => {
      const res = await repondreContratAction(contratId, {
        accepter: false,
        motifRefus: motif,
      });
      if (!res.ok) { setError(res.error); return; }
      setRefusOpen(false);
    });
  }

  return (
    <div className="space-y-4">

      {/* MetaMask co-signature (optional) */}
      <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            Co-sign with MetaMask
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-normal text-muted-foreground">
              optional
            </span>
          </p>
          {walletAddress && (
            <button
              type="button"
              onClick={() => setWalletAddress(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Disconnect wallet"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {walletAddress ? (
          <p className="rounded-md bg-success/10 px-3 py-1.5 text-xs font-mono text-success-text break-all">
            ✓ {walletAddress}
          </p>
        ) : metaMaskAvailable === true ? (
          /* MetaMask est installée */
          <Button type="button" size="sm" variant="outline" onClick={connectMetaMask}>
            <Wallet className="size-4" aria-hidden />
            Connect MetaMask
          </Button>
        ) : metaMaskAvailable === false ? (
          /* MetaMask n'est pas installée — message informatif, pas d'erreur */
          <p className="text-xs text-muted-foreground">
            MetaMask is not installed.{" "}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-text underline underline-offset-2"
            >
              Install it
              <ExternalLink className="size-3" aria-hidden />
            </a>{" "}
            to add your wallet address to the blockchain record — or sign without it below.
          </p>
        ) : null /* null = détection en cours, on n'affiche rien */ }

        {!walletAddress && (
          <p className="text-xs text-muted-foreground">
            Your signature is valid without MetaMask. The wallet address is only an
            additional proof of identity on the blockchain.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive-text">
          {error}
        </p>
      )}

      {/* Boutons principaux */}
      <div className="flex gap-3">
        <Button className="flex-1" onClick={accept} disabled={isPending}>
          {isPending ? "Processing…" : "✓ Accept & sign"}
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-destructive-text hover:bg-destructive/10"
          onClick={() => setRefusOpen(true)}
          disabled={isPending}
        >
          Decline
        </Button>
      </div>

      {/* Decline dialog */}
      <Dialog open={refusOpen} onOpenChange={setRefusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline contract</DialogTitle>
            <DialogDescription>
              You can explain why you are declining. This will be visible to the studio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-refus">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="motif-refus"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={decline}>
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
