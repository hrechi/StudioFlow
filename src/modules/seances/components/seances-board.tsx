"use client";

import { CalendarDays, CalendarX2, List, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fullName } from "@/lib/mock-data-helpers";
import { formatDate, formatTime } from "@/lib/utils";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import {
  statutSeanceConfig,
  typeSeanceLabels,
  type Seance,
  type StatutSeance,
  type TypeSeance,
} from "../seance.types";
import { SeanceCalendar } from "./seance-calendar";

/** /dashboard/seances — calendar/list toggle + filters (status, type, photographe). */
export function SeancesBoard({
  seances,
  photographes,
}: {
  seances: Seance[];
  photographes: UtilisateurRef[];
}) {
  const [view, setView] = useState<"liste" | "calendrier">("liste");
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<StatutSeance | typeof ALL>(ALL);
  const [type, setType] = useState<TypeSeance | typeof ALL>(ALL);
  const [photographe, setPhotographe] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seances
      .filter((s) => statut === ALL || s.statut === statut)
      .filter((s) => type === ALL || s.type === type)
      .filter((s) => photographe === ALL || s.photographe.id === photographe)
      .filter((s) => !q || `${s.titre} ${fullName(s.client)}`.toLowerCase().includes(q))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  }, [seances, query, statut, type, photographe]);

  const photographeOptions = Object.fromEntries(photographes.map((p) => [p.id, fullName(p)]));

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="liste">
              <List aria-hidden />
              List
            </TabsTrigger>
            <TabsTrigger value="calendrier">
              <CalendarDays aria-hidden />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search sessions"
          placeholder="Search a session or a client…"
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={statut}
            onChange={setStatut}
            options={labelsOf(statutSeanceConfig)}
            allLabel="All statuses"
            label="Filter by status"
            className="w-40"
          />
          <FilterSelect
            value={type}
            onChange={setType}
            options={typeSeanceLabels}
            allLabel="All types"
            label="Filter by type"
            className="w-40"
          />
          <FilterSelect
            value={photographe}
            onChange={setPhotographe}
            options={photographeOptions}
            allLabel="All photographers"
            label="Filter by photographer"
            className="w-48"
          />
        </div>
      </div>

      <div className="p-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No matching sessions"
            description="Change the filters or schedule a new session."
            action={
              <Button asChild>
                <Link href="/dashboard/seances/nouvelle">New session</Link>
              </Button>
            }
          />
        ) : view === "calendrier" ? (
          <SeanceCalendar seances={filtered} baseHref="/dashboard/seances" />
        ) : (
          <SeanceTable seances={filtered} />
        )}
      </div>
    </Card>
  );
}

function SeanceTable({ seances }: { seances: Seance[] }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">Session list</caption>
        <thead>
          <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5">Session</th>
            <th className="px-4 py-2.5">Client</th>
            <th className="px-4 py-2.5">Photographer</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Location</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {seances.map((seance) => (
            <tr key={seance.id} className="border-b last:border-0 hover:bg-surface/60">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/seances/${seance.id}`}
                  className="group flex items-center gap-3"
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <SafeImage
                      src={seance.couverture}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground group-hover:text-primary-text">
                      {seance.titre}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {typeSeanceLabels[seance.type]}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-slate">{fullName(seance.client)}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2 text-slate">
                  <UserAvatar {...seance.photographe} size="sm" />
                  {seance.photographe.prenom}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate">
                {formatDate(seance.dateDebut)}
                <span className="block text-xs text-muted-foreground">
                  {formatTime(seance.dateDebut)} – {formatTime(seance.dateFin)}
                </span>
              </td>
              <td className="max-w-40 truncate px-4 py-3 text-slate">{seance.lieu.nom}</td>
              <td className="px-4 py-3">
                <StatusBadge value={seance.statut} config={statutSeanceConfig} />
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${seance.titre}`}
                    >
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/seances/${seance.id}`}>View details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => comingSoon("Confirm the session")}>
                      Confirm
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => comingSoon("Edit the session")}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => comingSoon("Cancel the session")}
                      className="text-destructive-text focus:bg-destructive/10 focus:text-destructive-text"
                    >
                      Cancel session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
