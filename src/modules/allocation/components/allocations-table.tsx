"use client";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Ban, Blocks, CheckCheck, Hand, Loader2, PackageCheck, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDateTime } from "@/lib/utils";
import { recordAllocationStepAction } from "../allocation.actions";
import {
  etatEquipementConfig,
  statutAllocationConfig,
  type ActionAllocation,
  type Allocation,
  type EtatRetour,
} from "../allocation.types";
import {
  cancelAllocationTx,
  checkoutTx,
  confirmAllocationTx,
  returnEquipmentTx,
  walletErrorMessage,
  type SentTx,
} from "../blockchain.client";
import { TxHash } from "./tx-hash";
import { useWallet } from "./wallet-panel";

type Step = Exclude<ActionAllocation, "REQUEST">;

const STEP_DONE: Record<Step, string> = {
  CONFIRM: "Allocation confirmed",
  CHECKOUT: "Equipment marked as taken",
  RETURN: "Return recorded",
  CANCEL: "Allocation cancelled",
};

/** Allocations with their status and the steps the viewer may sign. */
export function AllocationsTable({
  allocations,
  isAdmin,
  currentUserId,
  showOwner,
}: {
  allocations: Allocation[];
  isAdmin: boolean;
  currentUserId: string;
  /** Show the "Booked by" column (admin view of everyone's allocations). */
  showOwner: boolean;
}) {
  const router = useRouter();
  const { config, ready } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [returning, setReturning] = useState<Allocation | null>(null);
  const [isPending, startTransition] = useTransition();

  const sign = (a: Allocation, step: Step, etatRetour?: EtatRetour) =>
    startTransition(async () => {
      setBusy(`${a.id}:${step}`);
      try {
        let tx: SentTx;
        if (step === "CONFIRM") tx = await confirmAllocationTx(config, a.id);
        else if (step === "CHECKOUT") tx = await checkoutTx(config, a.id);
        else if (step === "RETURN") tx = await returnEquipmentTx(config, a.id, etatRetour!);
        else tx = await cancelAllocationTx(config, a.id);

        const saved = await recordAllocationStepAction({
          id: a.id,
          action: step,
          txHash: tx.txHash,
          etatRetour,
        });
        if (!saved.ok) throw new Error(saved.error);
        toast.success(STEP_DONE[step], {
          description: <TxHash hash={tx.txHash} block={tx.blockNumber} />,
        });
        setReturning(null);
        router.refresh();
      } catch (error) {
        toast.error("Not recorded", { description: walletErrorMessage(error).message });
      } finally {
        setBusy(null);
      }
    });

  if (allocations.length === 0) {
    return (
      <EmptyState
        icon={Blocks}
        title="No allocations yet"
        description="Allocations signed on the blockchain will appear here."
      />
    );
  }

  const button = (
    a: Allocation,
    step: Step,
    label: string,
    icon: typeof Hand,
    variant: "default" | "outline" | "destructive-soft" = "outline",
  ) => {
    const Icon = icon;
    const loading = busy === `${a.id}:${step}`;
    return (
      <Button
        key={step}
        size="sm"
        variant={variant}
        disabled={!ready || isPending}
        title={ready ? undefined : "Connect your linked wallet on the Ganache network first"}
        onClick={() => (step === "RETURN" ? setReturning(a) : sign(a, step))}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
        {label}
      </Button>
    );
  };

  const actionsFor = (a: Allocation) => {
    const mine = a.utilisateur?.id === currentUserId;
    const canBookerStep = isAdmin || mine;
    const out = [];
    if (a.statut === "EN_ATTENTE" && isAdmin)
      out.push(button(a, "CONFIRM", "Confirm", CheckCheck, "default"));
    if (a.statut === "CONFIRMEE" && canBookerStep)
      out.push(button(a, "CHECKOUT", "Mark as taken", PackageOpen, "default"));
    if (a.statut === "EN_COURS" && isAdmin)
      out.push(button(a, "RETURN", "Record return", PackageCheck, "default"));
    if ((a.statut === "EN_ATTENTE" || a.statut === "CONFIRMEE") && canBookerStep) {
      out.push(button(a, "CANCEL", "Cancel", Ban, "destructive-soft"));
    }
    return out;
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Allocations</caption>
          <thead>
            <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5">Equipment</th>
              <th className="px-4 py-2.5">Session</th>
              {showOwner && <th className="px-4 py-2.5">Booked by</th>}
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Blockchain</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => {
              const request = a.txHashes.find((t) => t.action === "REQUEST");
              const actions = actionsFor(a);
              return (
                <tr key={a.id} className="border-b last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/allocation/${a.id}`}
                      className="font-semibold text-foreground hover:text-primary-text hover:underline"
                    >
                      {a.materiel.nom}
                    </Link>
                    <p className="text-xs text-muted-foreground">{a.materiel.numeroSerie}</p>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-slate">{a.seance.titre}</td>
                  {showOwner && (
                    <td className="px-4 py-3 text-slate">
                      {a.utilisateur ? fullName(a.utilisateur) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-slate">
                    {formatDateTime(a.dateDebut)}
                    <span className="block text-xs text-muted-foreground">
                      → {formatDateTime(a.dateFin)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge value={a.statut} config={statutAllocationConfig} />
                      {a.etatRetour && (
                        <span className="text-xs text-muted-foreground">
                          Returned {etatEquipementConfig[a.etatRetour].label.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {request && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success-text ring-1 ring-success/25"
                        title={`${a.txHashes.length} verified transaction(s)`}
                      >
                        ✅ On blockchain
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        "flex flex-wrap justify-end gap-1.5",
                        !actions.length && "text-right",
                      )}
                    >
                      {actions.length ? (
                        actions
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!returning} onOpenChange={(open) => !open && setReturning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record the return</DialogTitle>
            <DialogDescription>
              {returning?.materiel.nom} — in what condition did it come back? This is written on the
              blockchain and updates the item&apos;s condition there.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(["BON", "USE"] as const).map((etat) => (
              <Button
                key={etat}
                variant="outline"
                className="h-16 flex-col gap-1"
                disabled={isPending}
                onClick={() => returning && sign(returning, "RETURN", etat)}
              >
                <StatusBadge value={etat} config={etatEquipementConfig} />
                <span className="text-xs text-muted-foreground">
                  {etat === "BON" ? "Works perfectly" : "Visible wear"}
                </span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturning(null)} disabled={isPending}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
