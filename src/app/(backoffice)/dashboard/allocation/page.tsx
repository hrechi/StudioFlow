/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Blocks, CheckCheck, Hourglass, PackageOpen, ServerOff } from "lucide-react";
import type { Metadata } from "next";
import { chainName } from "@/modules/allocation/allocation.types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireArea } from "@/lib/guards";
import {
  countSeancesNotYetAllocatable,
  getWalletStatus,
  listAllocatableMaterielsWithChain,
  listAllocations,
  listMaterielsOnChain,
  listPhotographersWithWallets,
} from "@/modules/allocation/allocation.service";
import { checkChain, getChainConfig } from "@/modules/allocation/blockchain.server";
import { AdminChainTools } from "@/modules/allocation/components/admin-chain-tools";
import { AllocationForm } from "@/modules/allocation/components/allocation-form";
import { AllocationsTable } from "@/modules/allocation/components/allocations-table";
import { WalletPanel, WalletProvider } from "@/modules/allocation/components/wallet-panel";
import { listSeancesReservables } from "@/modules/materiel/seance-source";

export const metadata: Metadata = { title: "Blockchain allocation" };

export default async function AllocationPage() {
  const user = await requireArea("dashboard");
  const isAdmin = user.role === "ADMIN";
  const [chain, wallet, materiels, seances, hiddenSeances, allocations] = await Promise.all([
    checkChain(),
    getWalletStatus(user.id),
    listAllocatableMaterielsWithChain(),
    listSeancesReservables(),
    countSeancesNotYetAllocatable(),
    listAllocations(isAdmin ? undefined : user.id),
  ]);
  const [materielsOnChain, photographes] = isAdmin
    ? await Promise.all([listMaterielsOnChain(), listPhotographersWithWallets()])
    : [[], []];
  const chainOk = chain.reachable && chain.deployed;
  const count = (statut: string) => allocations.filter((a) => a.statut === statut).length;

  const config = getChainConfig();
  const network = chainName(config.chainId);
  return (
    <WalletProvider
      config={config}
      // Two facts, two flags: "offline" only when the chain really can't be reached.
      status={{
        ...wallet,
        chainReachable: chain.reachable && wallet.chainReachable,
        chainDeployed: chain.deployed,
      }}
    >
      <div className="space-y-6">
        <PageHeader
          title="Blockchain allocation"
          description="Every allocation step is signed with MetaMask and recorded on the EquipmentAllocation smart contract: a tamper-proof history of who used which equipment, when, and how it came back."
        />

        {!chainOk && (
          <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive-text ring-1 ring-destructive/20">
            <ServerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            {chain.reachable
              ? `${network} is reachable but the EquipmentAllocation contract is not deployed there. Run npm run deploy:allocation in the reframe-blockchain folder (see DEPLOYMENT.md), then redeploy the app.`
              : network === "Ganache"
                ? "Ganache is offline. Run npm run ganache in the contracts folder (keep it open), then reload."
                : `${network} can't be reached right now. Try again in a moment.`}
          </p>
        )}

        <WalletPanel isAdmin={isAdmin} />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Pending" value={count("EN_ATTENTE")} icon={Hourglass} tone="amber" />
          <StatCard label="Confirmed" value={count("CONFIRMEE")} icon={CheckCheck} />
          <StatCard label="In use" value={count("EN_COURS")} icon={PackageOpen} tone="ai" />
          <StatCard
            label="On the blockchain"
            value={allocations.length}
            icon={Blocks}
            tone="green"
          />
        </div>

        <AllocationForm
          materiels={materiels}
          isAdmin={isAdmin}
          hiddenSeances={hiddenSeances}
          seances={seances.map((s) => ({
            id: s.id,
            titre: s.titre,
            dateDebut: s.dateDebut,
            dateFin: s.dateFin,
            clientNom: s.clientNom,
          }))}
        />

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium tracking-[0.08em] text-foreground uppercase">
            {isAdmin ? "All allocations" : "My allocations"}
          </h2>
          <AllocationsTable
            allocations={allocations}
            isAdmin={isAdmin}
            currentUserId={user.id}
            showOwner={isAdmin}
          />
        </section>

        {isAdmin && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium tracking-[0.08em] text-foreground uppercase">
              Blockchain setup
            </h2>
            <AdminChainTools materiels={materielsOnChain} photographes={photographes} />
          </section>
        )}
      </div>
    </WalletProvider>
  );
}
