"use client";

import { Inbox, MessagesSquare, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatRelative } from "@/lib/utils";
import {
  categorieReclamationLabels,
  prioriteConfig,
  reclamationHref,
  statutReclamationConfig,
  type Priorite,
  type Reclamation,
  type StatutReclamation,
} from "../avis.types";

const PRIORITY_ORDER: Record<Priorite, number> = { URGENTE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 };

/** /dashboard/reclamations — complaints table; a row opens its conversation page. */
export function ReclamationsBoard({ reclamations }: { reclamations: Reclamation[] }) {
  const [statut, setStatut] = useState<StatutReclamation | typeof ALL>(ALL);
  const [priorite, setPriorite] = useState<Priorite | typeof ALL>(ALL);

  const list = useMemo(
    () =>
      reclamations
        .filter((r) => statut === ALL || r.statut === statut)
        .filter((r) => priorite === ALL || r.priorite === priorite)
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priorite] - PRIORITY_ORDER[b.priorite] ||
            b.dateCreation.localeCompare(a.dateCreation),
        ),
    [reclamations, statut, priorite],
  );

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutReclamationConfig)}
          allLabel="All statuses"
          label="Filter by status"
        />
        <FilterSelect
          value={priorite}
          onChange={setPriorite}
          options={labelsOf(prioriteConfig)}
          allLabel="All priorities"
          label="Filter by priority"
        />
        <p className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-ai" aria-hidden />
          Category and priority suggested by the AI
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No complaints"
          description="Nothing to handle for these filters."
          className="m-4"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Complaints</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Complaint</th>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">AI category</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Messages</th>
                <th className="px-4 py-2.5">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  className="relative cursor-pointer border-b last:border-0 hover:bg-surface/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={reclamationHref(r.id, "staff")}
                      className="font-semibold text-foreground after:absolute after:inset-0 hover:text-primary-text"
                    >
                      {r.objet}
                    </Link>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                      {r.seance.titre}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate">{fullName(r.client)}</td>
                  <td className="px-4 py-3 text-slate">
                    {categorieReclamationLabels[r.categorie]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-xs font-semibold text-ai-text ring-1 ring-ai/20",
                        r.categorieIA !== r.categorie && "ring-ai",
                      )}
                    >
                      <Sparkles className="size-3" aria-hidden />
                      {categorieReclamationLabels[r.categorieIA]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusBadge value={r.priorite} config={prioriteConfig} />
                      {r.escaladeIA && r.statut !== "RESOLUE" && r.statut !== "REJETEE" && (
                        <TriangleAlert
                          className="size-4 text-ai"
                          aria-label="AI: client frustration rising"
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.statut} config={statutReclamationConfig} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-slate">
                      <MessagesSquare className="size-3.5" aria-hidden />
                      {r.messages.filter((m) => !m.evenement).length}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatRelative(r.derniereActivite)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
