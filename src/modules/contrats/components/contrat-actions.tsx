"use client";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Boutons d'action admin (envoyer, relancer ancrage, révoquer, supprimer).
 */
import { AlertTriangle, RefreshCw, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  envoyerContratAction,
  relancerAncrageAction,
  revoquerContratAction,
  supprimerContratAction,
} from "../contrat.actions";
import type { ContratDTO } from "../contrat.types";

export function ContratActions({ contrat }: { contrat: ContratDTO }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revoquerOpen, setRevoquerOpen] = useState(false);
  const [raison, setRaison] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "An error occurred.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {contrat.statut === "BROUILLON" && (
        <Button
          size="sm"
          onClick={() => run(() => envoyerContratAction(contrat.id))}
          disabled={isPending}
        >
          <Send className="size-4" aria-hidden />
          Send to client
        </Button>
      )}

      {contrat.statut === "ACCEPTE" &&
        contrat.blockchain?.statut !== "ANCRE" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(() => relancerAncrageAction(contrat.id))}
            disabled={isPending}
          >
            <RefreshCw className="size-4" aria-hidden />
            {contrat.blockchain?.statut === "ECHEC" ? "Retry anchor" : "Anchor now"}
          </Button>
        )}

      {contrat.statut === "ACCEPTE" && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive-text hover:bg-destructive/10"
          onClick={() => setRevoquerOpen(true)}
          disabled={isPending}
        >
          <AlertTriangle className="size-4" aria-hidden />
          Revoke
        </Button>
      )}

      {["BROUILLON", "REFUSE"].includes(contrat.statut) && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive-text hover:bg-destructive/10"
          onClick={() =>
            run(async () => {
              const res = await supprimerContratAction(contrat.id);
              if (res.ok) router.push("/dashboard/contrats");
              return res;
            })
          }
          disabled={isPending}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
      )}

      {error && (
        <p className="w-full text-xs text-destructive-text">{error}</p>
      )}

      {/* Revoke dialog */}
      <Dialog open={revoquerOpen} onOpenChange={setRevoquerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke contract</DialogTitle>
            <DialogDescription>
              This will mark the contract as revoked on-chain. The action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="raison-revocation">Reason</Label>
            <Textarea
              id="raison-revocation"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex: Session cancelled by mutual agreement."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoquerOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!raison.trim() || isPending}
              onClick={() => {
                setRevoquerOpen(false);
                run(() => revoquerContratAction(contrat.id, { raison }));
              }}
            >
              Confirm revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
