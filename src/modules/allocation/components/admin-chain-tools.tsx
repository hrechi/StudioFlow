"use client";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { CheckCircle2, Loader2, PackagePlus, ServerOff, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fullName } from "@/lib/mock-data-helpers";
import type { Materiel } from "@/modules/materiel/materiel.types";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { confirmEquipmentRegisteredAction, confirmStaffAddedAction } from "../allocation.actions";
import { etatEquipementConfig, type EquipementChain } from "../allocation.types";
import {
  addStaffTx,
  registerEquipmentTx,
  shortAddress,
  walletErrorMessage,
} from "../blockchain.client";
import { TxHash } from "./tx-hash";
import { useWallet } from "./wallet-panel";

/** Admin only: put equipment and photographers' wallets on the contract (owner wallet signs). */
export function AdminChainTools({
  materiels,
  photographes,
}: {
  /** `chain` is null when Ganache could not be read. */
  materiels: { materiel: Materiel; chain: EquipementChain | null }[];
  photographes: { photographe: UtilisateurRef; wallet: string | null; staff: boolean | null }[];
}) {
  const router = useRouter();
  const { config, ready, status } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSign = ready && status.owner;

  const run = (
    key: string,
    fn: () => Promise<{ txHash: string; blockNumber: number }>,
    done: string,
  ) =>
    startTransition(async () => {
      setBusy(key);
      try {
        const tx = await fn();
        toast.success(done, { description: <TxHash hash={tx.txHash} block={tx.blockNumber} /> });
        router.refresh();
      } catch (error) {
        toast.error("Not done", { description: walletErrorMessage(error).message });
      } finally {
        setBusy(null);
      }
    });

  const register = (m: Materiel) =>
    run(
      `m:${m.id}`,
      async () => {
        const tx = await registerEquipmentTx(config, m.id, m.etat);
        const verified = await confirmEquipmentRegisteredAction({
          materielId: m.id,
          txHash: tx.txHash,
        });
        if (!verified.ok) throw new Error(verified.error);
        return tx;
      },
      `${m.nom} registered on the blockchain`,
    );

  const addStaff = (p: UtilisateurRef, wallet: string) =>
    run(
      `p:${p.id}`,
      async () => {
        const tx = await addStaffTx(config, wallet);
        const verified = await confirmStaffAddedAction({ utilisateurId: p.id, txHash: tx.txHash });
        if (!verified.ok) throw new Error(verified.error);
        return tx;
      },
      `${fullName(p)} can now book on the blockchain`,
    );

  const offline = <ServerOff className="size-4 text-destructive" aria-label="Ganache offline" />;
  const spinner = <Loader2 className="animate-spin" aria-hidden />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="size-4 text-primary" aria-hidden />
            Register equipment on-chain
          </CardTitle>
          <CardDescription>
            An item must be registered once before it can be allocated. Its current condition is
            written with it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="max-h-96 divide-y overflow-y-auto">
            {materiels.map(({ materiel: m, chain }) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.numeroSerie}</p>
                </div>
                {chain === null ? (
                  offline
                ) : chain.registered ? (
                  <span className="flex items-center gap-2">
                    {chain.etat && <StatusBadge value={chain.etat} config={etatEquipementConfig} />}
                    <CheckCircle2 className="size-4 text-success" aria-label="Registered" />
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canSign || isPending}
                    onClick={() => register(m)}
                  >
                    {busy === `m:${m.id}` ? spinner : <PackagePlus aria-hidden />}
                    Register
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" aria-hidden />
            Photographers&apos; wallets
          </CardTitle>
          <CardDescription>
            A photographer links their MetaMask wallet on this page; add it as staff so it can book.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {photographes.map(({ photographe: p, wallet, staff }) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <UserAvatar {...p} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{fullName(p)}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {wallet ? shortAddress(wallet) : "No wallet linked yet"}
                  </p>
                </div>
                {!wallet ? null : staff === null ? (
                  offline
                ) : staff ? (
                  <span className="text-xs font-medium text-success-text">Staff ✓</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canSign || isPending}
                    onClick={() => addStaff(p, wallet)}
                  >
                    {busy === `p:${p.id}` ? spinner : <UserPlus aria-hidden />}
                    Add as staff
                  </Button>
                )}
              </li>
            ))}
            {photographes.length === 0 && (
              <li className="py-4 text-center text-sm text-muted-foreground">No photographers.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
