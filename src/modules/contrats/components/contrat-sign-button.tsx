"use client";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Bouton de signature client : accepter/refuser + co-signature MetaMask (optionnelle).
 */
import { Wallet } from "lucide-react";
import { useState, useTransition } from "react";
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

  async function connectMetaMask(): Promise<string | null> {
    if (!window.ethereum) return null;
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      return accounts[0] ?? null;
    } catch {
      return null;
    }
  }

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await repondreContratAction(contratId, {
        accepter: true,
        clientWallet: walletAddress ?? undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      // revalidatePath dans l'action rafraîchit la page automatiquement
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
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-4">
      {/* MetaMask co-signature (optional) */}
      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          Co-sign with MetaMask{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect your Ethereum wallet to add your address to the blockchain record.
          This is not required to sign the contract.
        </p>
        {walletAddress ? (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-1.5 text-xs font-mono text-success-text">
            ✓ {walletAddress}
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              const addr = await connectMetaMask();
              if (addr) setWalletAddress(addr);
              else setError("MetaMask not available or connection refused.");
            }}
          >
            <Wallet className="size-4" aria-hidden />
            Connect MetaMask
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive-text">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={accept}
          disabled={isPending}
        >
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
            <Label htmlFor="motif-refus">Reason <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="motif-refus"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={decline}
            >
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
