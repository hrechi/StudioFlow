"use client";

import { ClipboardList, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fullName } from "@/lib/mock-data-helpers";
import { formatDate } from "@/lib/utils";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { deleteTacheAction, generateTachesAction, setTacheStatutAction } from "../tache.actions";
import {
  PHASES, STATUTS_TACHE, phaseLabels, prioriteConfig, statutTacheConfig,
  type StatutTache, type TacheDTO,
} from "../tache.dto";
import { TacheDialog } from "./tache-dialog";

type Props = {
  taches: TacheDTO[];
  seances: { id: string; titre: string }[];
  photographes: UtilisateurRef[];
  isAdmin: boolean;
  currentUserId: string;
};

function StatutCell({ tache, editable }: { tache: TacheDTO; editable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!editable) return <StatusBadge value={tache.statut} config={statutTacheConfig} />;
  return (
    <Select value={tache.statut} disabled={pending}
      onValueChange={(v) => startTransition(async () => {
        const result = await setTacheStatutAction(tache.id, v);
        if (!result.ok) toast.error(result.error);
        else router.refresh();
      })}>
      <SelectTrigger className="h-8 w-36" aria-label={`Status of ${tache.titre}`}>
        <SelectValue>{statutTacheConfig[tache.statut].label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUTS_TACHE.map((s) => <SelectItem key={s} value={s}>{statutTacheConfig[s].label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function GenerateBar({ seances }: { seances: { id: string; titre: string }[] }) {
  const router = useRouter();
  const [seanceId, setSeanceId] = useState("");
  const [pending, startTransition] = useTransition();
  const generate = () => startTransition(async () => {
    const result = await generateTachesAction(seanceId);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.data.created ? `${result.data.created} task(s) proposed` : "Already generated");
      router.refresh();
    }
  });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <Sparkles className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-sm text-muted-foreground">Propose the standard tasks for a session:</span>
      <Select value={seanceId} onValueChange={setSeanceId}>
        <SelectTrigger className="h-9 w-64 bg-card" aria-label="Session">
          <SelectValue placeholder="Choose a session">{seances.find((s) => s.id === seanceId)?.titre}</SelectValue>
        </SelectTrigger>
        <SelectContent>{seances.map((s) => <SelectItem key={s.id} value={s.id}>{s.titre}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" onClick={generate} disabled={!seanceId || pending}>Generate</Button>
    </div>
  );
}

function RowActions({ tache, seances, photographes }: { tache: TacheDTO } & Pick<Props, "seances" | "photographes">) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const remove = () => startTransition(async () => {
    const result = await deleteTacheAction(tache.id);
    if (!result.ok) toast.error(result.error);
    else { toast.success("Task deleted"); router.refresh(); }
    setConfirm(false);
  });
  return (
    <>
      <div className="flex justify-end gap-1">
        <TacheDialog tache={tache} seances={seances} photographes={photographes}
          trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${tache.titre}`}><Pencil aria-hidden /></Button>} />
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${tache.titre}`} onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} tone="destructive"
        title={`Delete "${tache.titre}"?`} description="This cannot be undone." confirmLabel="Delete"
        pending={pending} onConfirm={remove} />
    </>
  );
}

export function TachesBrowser({ taches, seances, photographes, isAdmin, currentUserId }: Props) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<StatutTache | typeof ALL>(ALL);
  const [phase, setPhase] = useState<string>(ALL);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return taches.filter(
      (t) =>
        (statut === ALL || t.statut === statut) &&
        (phase === ALL || t.phase === phase) &&
        `${t.titre} ${t.seance.titre}`.toLowerCase().includes(needle),
    );
  }, [taches, q, statut, phase]);

  const late = taches.filter((t) => t.enRetard).length;

  return (
    <div className="space-y-4">
      {isAdmin && seances.length > 0 && <GenerateBar seances={seances} />}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} label="Search tasks" placeholder="Task or session…" className="w-64" />
        <FilterSelect value={statut} onChange={setStatut} options={labelsOf(statutTacheConfig)} allLabel="All statuses" label="Filter by status" />
        <FilterSelect value={phase} onChange={setPhase} options={Object.fromEntries(PHASES.map((p) => [p, phaseLabels[p]]))} allLabel="All phases" label="Filter by phase" />
        {late > 0 && <ToneBadge tone="danger" label={`${late} overdue`} />}
        {isAdmin && (
          <div className="ml-auto">
            <TacheDialog seances={seances} photographes={photographes}
              trigger={<Button><Plus aria-hidden />New task</Button>} />
          </div>
        )}
      </div>
      <DataTable
        caption="Tasks"
        rows={rows}
        getRowKey={(t) => t.id}
        empty={
          <EmptyState icon={ClipboardList}
            title={taches.length === 0 ? "No tasks yet" : "No task matches your filters"}
            description={taches.length === 0
              ? isAdmin ? "Create a task, or generate the standard list for a session." : "Tasks assigned to you will appear here."
              : "Try another search or reset the filters."} />
        }
        columns={[
          {
            key: "titre", header: "Task",
            cell: (t) => (
              <div>
                <p className="font-medium text-foreground">{t.titre}</p>
                <p className="text-xs text-muted-foreground">{phaseLabels[t.phase]} · {t.seance.titre}</p>
              </div>
            ),
          },
          { key: "employe", header: "Assigned to", hideOnMobile: true,
            cell: (t) => t.employe ? fullName(t.employe) : <span className="text-muted-foreground">Unassigned</span> },
          {
            key: "dateLimite", header: "Deadline",
            cell: (t) => t.dateLimite ? (
              <span className="flex items-center gap-2">
                {formatDate(t.dateLimite)}
                {t.enRetard && <ToneBadge tone="danger" label="late" />}
              </span>
            ) : "—",
          },
          { key: "priorite", header: "Priority", hideOnMobile: true,
            cell: (t) => <StatusBadge value={t.priorite} config={prioriteConfig} /> },
          { key: "statut", header: "Status",
            cell: (t) => <StatutCell tache={t} editable={isAdmin || t.employe?.id === currentUserId} /> },
          ...(isAdmin ? [{
            key: "actions", header: <span className="sr-only">Actions</span>, className: "w-24 text-right",
            cell: (t: TacheDTO) => <RowActions tache={t} seances={seances} photographes={photographes} />,
          }] : []),
        ]}
      />
    </div>
  );
}
