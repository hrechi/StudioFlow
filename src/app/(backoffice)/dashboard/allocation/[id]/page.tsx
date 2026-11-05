/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { fullName } from "@/lib/mock-data-helpers";
import { formatDateTime } from "@/lib/utils";
import { getAllocationDetail, getWalletStatus } from "@/modules/allocation/allocation.service";
import {
  etatEquipementConfig,
  statutAllocationConfig,
} from "@/modules/allocation/allocation.types";
import { getChainConfig } from "@/modules/allocation/blockchain.server";
import { AllocationHistory } from "@/modules/allocation/components/allocation-history";
import { AllocationsTable } from "@/modules/allocation/components/allocations-table";
import { WalletPanel, WalletProvider } from "@/modules/allocation/components/wallet-panel";
import { categorieMaterielLabels } from "@/modules/materiel/materiel.types";

export const metadata: Metadata = { title: "Allocation" };

export default async function AllocationDetailPage({
  params,
}: PageProps<"/dashboard/allocation/[id]">) {
  const user = await requireArea("dashboard");
  const { id } = await params;
  // A photographer only opens their own allocations (checked in the service).
  const [detail, wallet] = await Promise.all([
    getAllocationDetail(id, user),
    getWalletStatus(user.id),
  ]);
  if (!detail) notFound();
  const { allocation: a, chain } = detail;
  const isAdmin = user.role === "ADMIN";

  const rows: [string, React.ReactNode][] = [
    [
      "Equipment",
      `${a.materiel.nom} · ${categorieMaterielLabels[a.materiel.categorie]} · ${a.materiel.numeroSerie}`,
    ],
    ["Session", a.seance.titre],
    ["Booked by", a.utilisateur ? fullName(a.utilisateur) : "—"],
    [
      "Wallet",
      <span key="w" className="font-mono text-xs">
        {a.walletAddress}
      </span>,
    ],
    ["Start", formatDateTime(a.dateDebut)],
    ["End", formatDateTime(a.dateFin)],
    [
      "Returned",
      a.etatRetour ? (
        <StatusBadge key="r" value={a.etatRetour} config={etatEquipementConfig} />
      ) : (
        "—"
      ),
    ],
    [
      "On-chain id",
      <span key="c" className="font-mono text-xs break-all">
        {a.chainAllocationId}
      </span>,
    ],
  ];

  return (
    <WalletProvider
      config={getChainConfig()}
      status={{ ...wallet, chainReachable: chain.reachable && wallet.chainReachable }}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            <Link
              href="/dashboard/allocation"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Blockchain allocation
            </Link>
          }
          title={a.materiel.nom}
          description={a.seance.titre}
          actions={<StatusBadge value={a.statut} config={statutAllocationConfig} />}
        />

        <WalletPanel isAdmin={isAdmin} />

        <AllocationsTable
          allocations={[a]}
          isAdmin={isAdmin}
          currentUserId={user.id}
          showOwner={isAdmin}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Details (StudioFlow)</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5 text-sm">
                {rows.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 text-slate">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <AllocationHistory detail={detail} />
        </div>
      </div>
    </WalletProvider>
  );
}
