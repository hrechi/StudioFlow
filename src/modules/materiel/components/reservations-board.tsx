"use client";

import { AlertTriangle, CalendarRange, List, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ALL, FilterSelect, labelsOf } from "@/components/shared/filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  statutReservationConfig,
  type Reservation,
  type StatutReservation,
} from "../materiel.types";
import { BreakdownDialog, ReturnDialog } from "./materiel-dialogs";

const dayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric" });

/** /dashboard/materiel/reservations — list + 7-day view, return and breakdown dialogs. */
export function ReservationsBoard({ reservations }: { reservations: Reservation[] }) {
  const [view, setView] = useState<"liste" | "semaine">("liste");
  const [statut, setStatut] = useState<StatutReservation | typeof ALL>(ALL);
  const list = useMemo(
    () =>
      reservations
        .filter((r) => statut === ALL || r.statut === statut)
        .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
    [reservations, statut],
  );

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, []);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="liste">
              <List aria-hidden />
              List
            </TabsTrigger>
            <TabsTrigger value="semaine">
              <CalendarRange aria-hidden />7 days
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={labelsOf(statutReservationConfig)}
          allLabel="All statuses"
          label="Filter by status"
        />
      </div>

      {view === "liste" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">Equipment reservations</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Equipment</th>
                <th className="px-4 py-2.5">Session</th>
                <th className="px-4 py-2.5">Photographer</th>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/materiel/${r.materiel.id}`}
                      className="font-semibold text-foreground hover:text-primary-text"
                    >
                      {r.materiel.nom}
                    </Link>
                    {r.remarqueRetour && (
                      <p className="text-xs text-muted-foreground">“{r.remarqueRetour}”</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate">{r.seance.titre}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-slate">
                      <UserAvatar {...r.photographe} size="sm" />
                      {fullName(r.photographe)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate">
                    {formatDate(r.dateDebut)} {formatTime(r.dateDebut)}
                    <span className="block text-xs text-muted-foreground">
                      → {formatDate(r.dateFin)} {formatTime(r.dateFin)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.statut} config={statutReservationConfig} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {(r.statut === "EN_COURS" || r.statut === "CONFIRMEE") && (
                        <ReturnDialog
                          materielNom={r.materiel.nom}
                          trigger={
                            <Button size="sm" variant="outline">
                              <PackageCheck aria-hidden />
                              Return
                            </Button>
                          }
                        />
                      )}
                      <BreakdownDialog
                        materielNom={r.materiel.nom}
                        trigger={
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Report a breakdown: ${r.materiel.nom}`}
                          >
                            <AlertTriangle aria-hidden />
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto p-4">
          <div className="grid min-w-[52rem] grid-cols-7 gap-2">
            {days.map((day) => {
              const items = list.filter((r) => {
                const start = new Date(r.dateDebut);
                const end = new Date(r.dateFin);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);
                return start <= dayEnd && end >= day && r.statut !== "ANNULEE";
              });
              return (
                <div key={day.toISOString()} className="min-h-48 rounded-xl bg-surface p-2">
                  <p className="mb-2 px-1 text-xs font-semibold text-slate capitalize">
                    {dayFormatter.format(day)}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className={cn(
                          "rounded-lg border bg-card p-2 text-xs",
                          r.statut === "EN_ATTENTE" ? "border-warning/40" : "border-primary/25",
                        )}
                      >
                        <p className="font-semibold text-foreground">{r.materiel.nom}</p>
                        <p className="truncate text-muted-foreground">{r.seance.titre}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
