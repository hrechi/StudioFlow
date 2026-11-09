/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import {
  AlertTriangle,
  Ban,
  CheckCheck,
  CircleCheck,
  PackageCheck,
  PackageOpen,
  Send,
  ServerOff,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import {
  actionAllocationLabels,
  etatEquipementConfig,
  type ActionAllocation,
  type AllocationDetail,
} from "../allocation.types";
import { TxHash } from "./tx-hash";

const ICONS: Record<ActionAllocation, LucideIcon> = {
  REQUEST: Send,
  CONFIRM: CheckCheck,
  CHECKOUT: PackageOpen,
  RETURN: PackageCheck,
  CANCEL: Ban,
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Timeline read from the contract events, checked against what StudioFlow recorded. */
export function AllocationHistory({ detail }: { detail: AllocationDetail }) {
  const { allocation, chain, differences } = detail;
  const recorded = new Set(allocation.txHashes.map((t) => t.txHash));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blockchain history</CardTitle>
        <CardDescription>
          Read live from the smart contract&apos;s events — the tamper-proof record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!chain.reachable ? (
          <p className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-text">
            <ServerOff className="size-4 shrink-0" aria-hidden />
            The blockchain can&apos;t be reached: the history cannot be read right now.
          </p>
        ) : differences.length > 0 ? (
          <div className="space-y-1.5 rounded-lg bg-warning/10 p-3 text-sm text-warning-text ring-1 ring-warning/25">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" aria-hidden />
              StudioFlow and the blockchain disagree
            </p>
            <ul className="list-disc space-y-0.5 pl-6">
              {differences.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success-text">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            StudioFlow matches the blockchain: {chain.events.length} verified step
            {chain.events.length > 1 ? "s" : ""}.
          </p>
        )}

        {chain.events.length > 0 && (
          <ol className="relative space-y-5 border-l border-border pl-6">
            {chain.events.map((e) => {
              const Icon = ICONS[e.action];
              return (
                <li key={e.txHash + e.action} className="relative">
                  <span
                    className={cn(
                      "absolute top-0 -left-[2.05rem] flex size-7 items-center justify-center rounded-full ring-4 ring-card",
                      e.action === "CANCEL"
                        ? "bg-destructive/15 text-destructive-text"
                        : "bg-accent text-primary-text",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {actionAllocationLabels[e.action]}
                    </p>
                    {e.etatRetour && (
                      <StatusBadge value={e.etatRetour} config={etatEquipementConfig} />
                    )}
                    {!recorded.has(e.txHash) && (
                      <span className="text-xs font-medium text-warning-text">
                        not in StudioFlow
                      </span>
                    )}
                  </div>
                  <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-[6rem_1fr]">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="text-slate">{formatDateTime(e.at)}</dd>
                    <dt className="text-muted-foreground">Wallet</dt>
                    <dd className="font-mono text-slate" title={e.wallet}>
                      {short(e.wallet)}
                    </dd>
                    <dt className="text-muted-foreground">Transaction</dt>
                    <dd>
                      <TxHash hash={e.txHash} block={e.blockNumber} className="text-slate" />
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
