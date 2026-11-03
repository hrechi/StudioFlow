"use client";

import { CalendarDays, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fullName } from "@/lib/mock-data-helpers";
import { formatDate, formatTime } from "@/lib/utils";
import { deleteSeanceAction, setSeanceStatutAction } from "../seance.actions";
import {
  STATUTS_SUPPRIMABLES,
  TRANSITIONS,
  nomClient,
  roleEquipeLabels,
  statutSeanceReelConfig,
  type SeanceDTO,
  type StatutSeanceReel,
} from "../seance.dto";

function RowMenu({ seance }: { seance: SeanceDTO }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const next = TRANSITIONS[seance.statut];
  const deletable = STATUTS_SUPPRIMABLES.includes(seance.statut);

  const change = (statut: StatutSeanceReel) =>
    startTransition(async () => {
      const result = await setSeanceStatutAction(seance.id, statut);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(`Status: ${statutSeanceReelConfig[statut].label}`);
        router.refresh();
      }
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSeanceAction(seance.id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Session deleted");
        router.refresh();
      }
      setConfirm(false);
    });

  return (
    <>
      <div className="flex justify-end gap-1">
        {next.length > 0 && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/dashboard/seances/${seance.id}`} aria-label={`Edit ${seance.titre}`}>
              <Pencil aria-hidden />
            </Link>
          </Button>
        )}
        {(next.length > 0 || deletable) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Actions for ${seance.titre}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {next.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => change(s)}>
                  Mark as {statutSeanceReelConfig[s].label.toLowerCase()}
                </DropdownMenuItem>
              ))}
              {next.length > 0 && deletable && <DropdownMenuSeparator />}
              {deletable && (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                  <Trash2 aria-hidden />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="destructive"
        title={`Delete "${seance.titre}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}

export function SeancesBrowser({
  seances,
  types,
  canEdit,
}: {
  seances: SeanceDTO[];
  types: { id: string; nom: string }[];
  canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<StatutSeanceReel | typeof ALL>(ALL);
  const [typeId, setTypeId] = useState<string>(ALL);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return seances.filter(
      (s) =>
        (statut === ALL || s.statut === statut) &&
        (typeId === ALL || s.typeEvenement.id === typeId) &&
        `${s.titre} ${nomClient(s)} ${s.lieu}`.toLowerCase().includes(needle),
    );
  }, [seances, q, statut, typeId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} label="Search sessions" placeholder="Title, client, location…" className="w-64" />
        <FilterSelect value={statut} onChange={setStatut} options={labelsOf(statutSeanceReelConfig)} allLabel="All statuses" label="Filter by status" />
        <FilterSelect value={typeId} onChange={setTypeId} options={Object.fromEntries(types.map((t) => [t.id, t.nom]))} allLabel="All event types" label="Filter by event type" />
      </div>
      <DataTable
        caption="Sessions"
        rows={rows}
        getRowKey={(s) => s.id}
        empty={
          <EmptyState
            icon={CalendarDays}
            title={seances.length === 0 ? "No sessions yet" : "No session matches your filters"}
            description={
              seances.length === 0
                ? canEdit ? "Create the first session, or wait for a client booking request." : "Sessions you are assigned to will appear here."
                : "Try another search or reset the filters."
            }
            action={
              canEdit && seances.length === 0 ? (
                <Button asChild>
                  <Link href="/dashboard/seances/nouveau">
                    <Plus aria-hidden />
                    New session
                  </Link>
                </Button>
              ) : undefined
            }
          />
        }
        columns={[
          {
            key: "titre",
            header: "Session",
            cell: (s) => (
              <div>
                <p className="font-medium text-foreground">{s.titre}</p>
                <p className="text-xs text-muted-foreground">
                  {s.typeEvenement.nom} · {s.pack?.nom ?? "Custom"} · {nomClient(s)}
                </p>
              </div>
            ),
          },
          {
            key: "date",
            header: "When",
            cell: (s) => (
              <span className="text-sm">
                {formatDate(s.dateDebut)}
                <span className="block text-xs text-muted-foreground">
                  {formatTime(s.dateDebut)} – {formatTime(s.dateFin)}
                </span>
              </span>
            ),
          },
          { key: "lieu", header: "Location", hideOnMobile: true, cell: (s) => s.lieu },
          {
            key: "equipe",
            header: "Team",
            hideOnMobile: true,
            cell: (s) =>
              s.equipe.length === 0 ? (
                <span className="text-muted-foreground">Unassigned</span>
              ) : (
                <span className="text-xs">
                  {s.equipe.map((m) => `${fullName(m.employe)} (${roleEquipeLabels[m.role]})`).join(", ")}
                </span>
              ),
          },
          {
            key: "statut",
            header: "Status",
            cell: (s) => <StatusBadge value={s.statut} config={statutSeanceReelConfig} />,
          },
          ...(canEdit
            ? [
                {
                  key: "prix",
                  header: "Prix",
                  hideOnMobile: true,
                  cell: (s: SeanceDTO) => {
                    const AVEC_PRIX: readonly StatutSeanceReel[] = ["CONFIRMEE", "EN_COURS", "TERMINEE", "REPORTEE"];
                    if (!AVEC_PRIX.includes(s.statut)) return null;
                    if (s.prixFinal != null) {
                      return (
                        <span className="text-sm font-medium text-foreground">
                          {s.prixFinal} TND
                        </span>
                      );
                    }
                    return (
                      <span className="text-xs text-muted-foreground italic">
                        À définir
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  className: "w-24 text-right",
                  cell: (s: SeanceDTO) => <RowMenu seance={s} />,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
