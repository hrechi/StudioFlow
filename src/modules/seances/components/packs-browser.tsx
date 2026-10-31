"use client";

import { Eye, EyeOff, Layers, MoreHorizontal, Pencil, Plus, Power } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { setPackStatutAction } from "../catalogue.actions";
import {
  statutPackConfig,
  type PackDTO,
  type StatutPack,
  type TypeEvenementDTO,
} from "../catalogue.types";

function RowMenu({ pack }: { pack: PackDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (statut: StatutPack, message: string) =>
    startTransition(async () => {
      const result = await setPackStatutAction(pack.id, statut);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(message);
        router.refresh();
      }
    });

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/dashboard/catalogue/packs/${pack.id}`} aria-label={`Edit ${pack.nom}`}>
          <Pencil aria-hidden />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Status actions for ${pack.nom}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {pack.statut !== "PUBLIE" && (
            <DropdownMenuItem onSelect={() => change("PUBLIE", "Pack published")}>
              <Eye aria-hidden />
              Publish
            </DropdownMenuItem>
          )}
          {pack.statut === "PUBLIE" && (
            <DropdownMenuItem onSelect={() => change("BROUILLON", "Pack unpublished")}>
              <EyeOff aria-hidden />
              Unpublish (draft)
            </DropdownMenuItem>
          )}
          {pack.statut !== "DESACTIVE" && (
            <DropdownMenuItem onSelect={() => change("DESACTIVE", "Pack disabled")}>
              <Power aria-hidden />
              Disable
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PacksBrowser({ packs, types }: { packs: PackDTO[]; types: TypeEvenementDTO[] }) {
  const [q, setQ] = useState("");
  const [typeId, setTypeId] = useState<string>(ALL);
  const [statut, setStatut] = useState<StatutPack | typeof ALL>(ALL);

  const rows = useMemo(
    () =>
      packs.filter(
        (p) =>
          (typeId === ALL || p.typeEvenement.id === typeId) &&
          (statut === ALL || p.statut === statut) &&
          p.nom.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [packs, q, typeId, statut],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} label="Search packs" placeholder="Search packs…" className="w-64" />
        <FilterSelect
          value={typeId}
          onChange={setTypeId}
          options={Object.fromEntries(types.map((t) => [t.id, t.nom]))}
          allLabel="All event types"
          label="Filter by event type"
        />
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutPackConfig)}
          allLabel="All statuses"
          label="Filter by status"
        />
      </div>
      <DataTable
        caption="Packs"
        rows={rows}
        getRowKey={(p) => p.id}
        empty={
          <EmptyState
            icon={Layers}
            title={packs.length === 0 ? "No packs yet" : "No pack matches your filters"}
            description={
              packs.length === 0
                ? "Create your first pack from an event type and your services."
                : "Try another search or reset the filters."
            }
            action={
              packs.length === 0 ? (
                <Button asChild>
                  <Link href="/dashboard/catalogue/packs/nouveau">
                    <Plus aria-hidden />
                    New pack
                  </Link>
                </Button>
              ) : undefined
            }
          />
        }
        columns={[
          {
            key: "nom",
            header: "Pack",
            cell: (p) => (
              <div>
                <Link
                  href={`/dashboard/catalogue/packs/${p.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {p.nom}
                </Link>
                <p className="text-xs text-muted-foreground">{p.typeEvenement.nom}</p>
              </div>
            ),
          },
          {
            key: "prix",
            header: "Price",
            cell: (p) => (
              <span className="flex items-center gap-2">
                {formatCurrency(p.prix)}
                {!p.afficherPrix && <ToneBadge tone="outline" label="hidden" />}
              </span>
            ),
          },
          {
            key: "prestations",
            header: "Services",
            hideOnMobile: true,
            cell: (p) => `${p.prestations.length}`,
          },
          {
            key: "statut",
            header: "Status",
            cell: (p) => (
              <span className="flex items-center gap-2">
                <StatusBadge value={p.statut} config={statutPackConfig} />
                {p.statut === "PUBLIE" && !p.typeEvenement.actif && (
                  <ToneBadge tone="warning" label="type disabled: hidden" />
                )}
              </span>
            ),
          },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "w-24 text-right",
            cell: (p) => <RowMenu pack={p} />,
          },
        ]}
      />
    </div>
  );
}
