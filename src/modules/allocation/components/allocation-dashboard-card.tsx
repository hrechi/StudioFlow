/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 * Dashboard card (staff home page): blockchain status, allocations by status and the latest ones.
 * Admin sees every allocation, a photographer only their own. Never breaks the dashboard:
 * if MongoDB or the chain fails, the card says so instead of throwing.
 */
import { Blocks } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/rbac";
import { cn, formatDate } from "@/lib/utils";
import { listAllocations } from "../allocation.service";
import { statutAllocationConfig, type Allocation, type StatutAllocation } from "../allocation.types";
import { checkChain } from "../blockchain.server";

const COUNTED: StatutAllocation[] = ["EN_ATTENTE", "CONFIRMEE", "EN_COURS", "RETOURNEE"];

export async function AllocationDashboardCard({ user }: { user: { id: string; role: Role } }) {
  const isAdmin = user.role === "ADMIN";
  const [listed, chain] = await Promise.all([
    listAllocations(isAdmin ? undefined : user.id).catch(() => null),
    checkChain().catch(() => ({ reachable: false, deployed: false })),
  ]);
  const loadError = listed === null;
  const allocations: Allocation[] = listed ?? [];

  const online = chain.reachable && chain.deployed;
  const chainLabel = !chain.reachable
    ? "Blockchain offline"
    : chain.deployed
      ? "Blockchain online"
      : "Contract not deployed";
  const latest = allocations.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Blocks className="size-5 shrink-0 text-primary" aria-hidden />
          <CardTitle className="truncate">{isAdmin ? "Blockchain allocations" : "My blockchain allocations"}</CardTitle>
        </div>
        <Link href="/dashboard/allocation" className="shrink-0 text-sm font-medium text-primary-text hover:underline">
          Open
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("size-2 rounded-full", online ? "bg-success" : "bg-destructive")} aria-hidden />
          {chainLabel}
        </p>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COUNTED.map((statut) => (
            <li key={statut} className="rounded-xl bg-surface p-3">
              <span className="block text-xl font-semibold text-foreground">
                {allocations.filter((a) => a.statut === statut).length}
              </span>
              <span className="block text-xs text-muted-foreground">{statutAllocationConfig[statut].label}</span>
            </li>
          ))}
        </ul>

        {loadError ? (
          <p className="text-sm text-muted-foreground">Allocations could not be loaded.</p>
        ) : latest.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No allocation yet.{" "}
            <Link href="/dashboard/allocation" className="font-medium text-primary-text hover:underline">
              Allocate equipment
            </Link>
          </p>
        ) : (
          <ul className="-mx-4 divide-y">
            {latest.map((a) => (
              <li key={a.id}>
                <Link href={`/dashboard/allocation/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{a.materiel.nom}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.seance.titre} · {formatDate(a.dateDebut)}
                    </span>
                  </span>
                  <StatusBadge value={a.statut} config={statutAllocationConfig} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
