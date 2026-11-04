"use client";

import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  List,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, labelsOf } from "@/components/shared/filters";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  statutReservationConfig,
  type Reservation,
  type StatutReservation,
} from "../materiel.types";
import { ReservationActions, type CurrentUser } from "./reservation-actions";
import { genererPackingListAction } from "../reservation-materiel.actions";

const MINE = { mine: "My reservations" } as const;
const dayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric" });
const monthRangeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DAY_START = 6;
const DAY_END = 24;
const HOUR_WIDTH = 12 * 16;

type Group = { key: string; reservations: Reservation[] };

function isOverdue(r: Reservation, now: number) {
  return r.statut === "EN_COURS" && new Date(r.dateFin).getTime() <= now;
}

function groupBySession(items: Reservation[]): Group[] {
  const groups = new Map<string, Reservation[]>();
  for (const reservation of items) {
    const key = reservation.seance.id;
    groups.set(key, [...(groups.get(key) ?? []), reservation]);
  }

  return [...groups].map(([key, reservations]) => ({ key, reservations }));
}

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

function sameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

function formatRange(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} - ${last.getDate()} ${new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(last)}`;
  }
  return `${monthRangeFormatter.format(first)} - ${monthRangeFormatter.format(last)}`;
}

function barTone(reservation: Reservation, now: number) {
  if (isOverdue(reservation, now)) return "border-red-700 bg-red-600 text-white";
  switch (reservation.statut) {
    case "EN_ATTENTE":
      return "border-warning bg-warning/80 text-warning-text";
    case "CONFIRMEE":
      return "border-primary bg-primary/80 text-primary-text";
    case "EN_COURS":
      return "border-ai bg-ai/80 text-ai-text";
    case "RETOURNEE":
      return "border-success/60 bg-success/30 text-success-text";
    case "ANNULEE":
      return "border-destructive/50 bg-destructive/20 text-destructive-text line-through opacity-60";
  }
}

function segmentForDay(reservation: Reservation, day: Date) {
  const start = new Date(reservation.dateDebut);
  const end = new Date(reservation.dateFin);
  const dayStart = new Date(day);
  dayStart.setHours(DAY_START, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(DAY_END, 0, 0, 0);
  const startAt = Math.max(start.getTime(), dayStart.getTime());
  const endAt = Math.min(end.getTime(), dayEnd.getTime());
  if (endAt <= startAt) return null;
  const total = (DAY_END - DAY_START) * 60 * 60 * 1000;
  return {
    left: ((startAt - dayStart.getTime()) / total) * 100,
    width: ((endAt - startAt) / total) * 100,
  };
}

function downloadCsv(items: Reservation[]) {
  const now = Date.now();
  const rows = [
    ["Equipment", "Serial", "Session", "Type", "Start", "End", "Status", "Reserved by"],
    ...items.map((r) => [
      r.materiel.nom,
      r.materiel.numeroSerie,
      r.seance.titre,
      r.seance.typeEvenement,
      r.dateDebut,
      r.dateFin,
      isOverdue(r, now) ? "Overdue" : statutReservationConfig[r.statut].label,
      r.utilisateur ? fullName(r.utilisateur) : "Deleted account",
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "equipment-reservations.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReservationsBoard({
  reservations,
  currentUser,
}: {
  reservations: Reservation[];
  currentUser: CurrentUser;
}) {
  const [view, setView] = useState<"list" | "week">("list");
  const [tab, setTab] = useState<"upcoming" | "history" | "all">("upcoming");
  const [statut, setStatut] = useState<StatutReservation | typeof ALL>(ALL);
  const [owner, setOwner] = useState<keyof typeof MINE | typeof ALL>(ALL);
  const [query, setQuery] = useState("");
  const [anchorDate, setAnchorDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  });
  const [daysCount, setDaysCount] = useState<7 | 14>(7);
  const [timelineMode, setTimelineMode] = useState<"equipment" | "session">("equipment");
  const [hideIdle, setHideIdle] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [now] = useState(() => Date.now());
  const [packingId, setPackingId] = useState<string | null>(null);

  async function downloadPackingList(id: string) {
    setPackingId(id);
    const result = await genererPackingListAction(id);
    setPackingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const bytes = Uint8Array.from(atob(result.data.base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "packing-list.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const counts = useMemo(() => {
    return {
      upcoming: reservations.filter(
        (r) =>
          new Date(r.dateFin).getTime() > now && r.statut !== "ANNULEE" && r.statut !== "RETOURNEE",
      ).length,
      history: reservations.filter((r) => r.statut === "RETOURNEE" || r.statut === "ANNULEE")
        .length,
      all: reservations.length,
    };
  }, [now, reservations]);

  const baseFiltered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return reservations
      .filter((r) => statut === ALL || r.statut === statut)
      .filter((r) => owner === ALL || r.utilisateur?.id === currentUser.id)
      .filter((r) => !text || `${r.materiel.nom} ${r.seance.titre}`.toLowerCase().includes(text))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  }, [reservations, statut, owner, query, currentUser.id]);

  const filtered = useMemo(
    () =>
      baseFiltered.filter((r) => {
        if (tab === "upcoming")
          return (
            new Date(r.dateFin).getTime() > now &&
            r.statut !== "ANNULEE" &&
            r.statut !== "RETOURNEE"
          );
        if (tab === "history") return r.statut === "RETOURNEE" || r.statut === "ANNULEE";
        return true;
      }),
    [baseFiltered, now, tab],
  );

  const groups = useMemo(() => groupBySession(filtered), [filtered]);
  const timelineDays = useMemo(
    () =>
      Array.from({ length: daysCount }, (_, index) => {
        const day = new Date(anchorDate);
        day.setDate(anchorDate.getDate() + index);
        return day;
      }),
    [anchorDate, daysCount],
  );
  const timelineReservations = useMemo(() => {
    const rangeStart = timelineDays[0].getTime();
    const rangeEnd = new Date(timelineDays.at(-1)!).setHours(23, 59, 59, 999);
    return baseFiltered.filter(
      (r) =>
        new Date(r.dateDebut).getTime() < rangeEnd && new Date(r.dateFin).getTime() > rangeStart,
    );
  }, [baseFiltered, timelineDays]);
  const equipmentRows = useMemo(() => {
    const grouped = new Map<string, { label: string; items: Reservation[] }>();
    for (const reservation of timelineReservations) {
      const category = reservation.materiel.categorie;
      const current = grouped.get(category) ?? { label: category.replaceAll("_", " "), items: [] };
      if (!current.items.some((item) => item.materiel.id === reservation.materiel.id)) {
        current.items.push(reservation);
      }
      grouped.set(category, current);
    }
    return [...grouped.entries()];
  }, [timelineReservations]);
  const sessionRows = useMemo(() => groupBySession(timelineReservations), [timelineReservations]);
  const isToday = (day: Date) => sameDay(day, new Date(now));
  const goToWeek = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + delta * daysCount);
    setAnchorDate(next);
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="space-y-4 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
            <TabsList>
              <TabsTrigger value="list">
                <List aria-hidden />
                List
              </TabsTrigger>
              <TabsTrigger value="week">
                <CalendarRange aria-hidden />7 days
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download aria-hidden />
            Export CSV
          </Button>
        </div>
        {view === "list" && (
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="upcoming">Upcoming & active ({counts.upcoming})</TabsTrigger>
              <TabsTrigger value="history">History ({counts.history})</TabsTrigger>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-52 flex-1">
            <Search
              className="absolute top-2.5 left-2.5 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search equipment or session…"
              className="pl-8"
              aria-label="Search reservations"
            />
          </label>
          <FilterSelect
            value={owner}
            onChange={setOwner}
            options={MINE}
            allLabel="Everyone"
            label="Filter by owner"
          />
          <FilterSelect
            value={statut}
            onChange={setStatut}
            options={labelsOf(statutReservationConfig)}
            allLabel="All statuses"
            label="Filter by status"
          />
          {view === "week" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 text-xs text-muted-foreground">
              Filters apply to the timeline
            </span>
          )}
        </div>
      </div>

      {view === "week" ? (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToWeek(-1)}
                aria-label="Previous period"
              >
                <ChevronLeft aria-hidden /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const today = new Date(now);
                  today.setHours(0, 0, 0, 0);
                  today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                  setAnchorDate(today);
                }}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToWeek(1)}
                aria-label="Next period"
              >
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="timeline-date">
                Start date
              </label>
              <input
                id="timeline-date"
                type="date"
                value={anchorDate.toISOString().slice(0, 10)}
                onChange={(event) => {
                  const value = new Date(`${event.target.value}T00:00:00`);
                  if (!Number.isNaN(value.getTime())) setAnchorDate(value);
                }}
                className="h-9 rounded-md border bg-card px-2 text-sm text-foreground"
              />
              <Tabs
                value={String(daysCount)}
                onValueChange={(value) => setDaysCount(Number(value) as 7 | 14)}
              >
                <TabsList>
                  <TabsTrigger value="7">7 days</TabsTrigger>
                  <TabsTrigger value="14">14 days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{formatRange(timelineDays)}</h2>
            <div className="flex items-center gap-2">
              <Tabs
                value={timelineMode}
                onValueChange={(value) => setTimelineMode(value as typeof timelineMode)}
              >
                <TabsList>
                  <TabsTrigger value="equipment">By equipment</TabsTrigger>
                  <TabsTrigger value="session">By session</TabsTrigger>
                </TabsList>
              </Tabs>
              {timelineMode === "equipment" && (
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hideIdle}
                    onChange={(event) => setHideIdle(event.target.checked)}
                  />
                  Hide idle equipment
                </label>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {[
              ["bg-warning", "Pending"],
              ["bg-primary", "Confirmed"],
              ["bg-ai", "In progress"],
              ["bg-success", "Returned"],
              ["bg-destructive", "Cancelled"],
              ["bg-red-600", "Overdue"],
            ].map(([tone, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-sm", tone)} aria-hidden />
                {label}
              </span>
            ))}
          </div>
          {timelineReservations.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No reservations this week"
              description="Try another date or adjust the timeline filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <div className="min-w-max">
                <div
                  className="sticky top-0 z-20 grid bg-card text-xs font-semibold text-muted-foreground"
                  style={{
                    gridTemplateColumns: `12rem repeat(${timelineDays.length}, ${HOUR_WIDTH}px)`,
                  }}
                >
                  <div className="sticky left-0 z-30 border-r bg-card p-3">Resource</div>
                  {timelineDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-r p-3 text-center",
                        isToday(day) && "bg-primary/10 text-primary-text",
                        day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/40" : "",
                      )}
                    >
                      {dayFormatter.format(day)}
                      <span className="mt-1 block text-[10px] font-normal">06:00 — 24:00</span>
                    </div>
                  ))}
                </div>
                {timelineMode === "equipment"
                  ? equipmentRows.map(([category, group]) => {
                      const items = group.items.filter(
                        (item) =>
                          !hideIdle ||
                          timelineReservations.some((r) => r.materiel.id === item.materiel.id),
                      );
                      if (items.length === 0) return null;
                      const collapsed = collapsedCategories.has(category);
                      return (
                        <div key={category}>
                          <button
                            type="button"
                            className="sticky left-0 z-10 flex w-full items-center gap-2 border-y bg-muted/70 px-3 py-2 text-left text-xs font-bold tracking-wide text-muted-foreground uppercase"
                            onClick={() =>
                              setCollapsedCategories((current) => {
                                const next = new Set(current);
                                if (next.has(category)) next.delete(category);
                                else next.add(category);
                                return next;
                              })
                            }
                            aria-expanded={!collapsed}
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                collapsed && "-rotate-90",
                              )}
                              aria-hidden
                            />
                            {group.label}
                          </button>
                          {!collapsed &&
                            items.map((item) => (
                              <GanttRow
                                key={item.materiel.id}
                                label={item.materiel.nom}
                                reservations={timelineReservations.filter(
                                  (r) => r.materiel.id === item.materiel.id,
                                )}
                                days={timelineDays}
                                now={now}
                                onSelect={setSelectedReservation}
                              />
                            ))}
                        </div>
                      );
                    })
                  : sessionRows.map((group) => (
                      <GanttRow
                        key={group.key}
                        label={group.reservations[0].seance.titre}
                        reservations={group.reservations}
                        days={timelineDays}
                        now={now}
                        onSelect={setSelectedReservation}
                      />
                    ))}
              </div>
            </div>
          )}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reservations"
          description={
            reservations.length === 0
              ? "No equipment has been reserved yet."
              : "No reservation matches these filters."
          }
          className="m-4"
        />
      ) : (
        <div className="space-y-4 p-4">
          {groups.map(({ key, reservations: items }) => {
            const first = items[0];
            const overdue = items.filter((item) => isOverdue(item, now)).length;
            return (
              <section key={key} className="rounded-xl border bg-card">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-surface/60 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {first.seance.titre}
                      </h2>
                      <ToneBadge tone="neutral" label={first.seance.typeEvenement} />
                      {overdue > 0 && <ToneBadge tone="danger" label={`${overdue} overdue`} dot />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(first.dateDebut)} {formatTime(first.dateDebut)} →{" "}
                      {formatTime(first.dateFin)}
                      {first.seance.lieu ? ` · ${first.seance.lieu}` : ""}
                      {first.seance.clientNom ? ` · ${first.seance.clientNom}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {items.length} equipment{items.length === 1 ? "" : "s"}
                    </span>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="Packing list"
                      title="Packing list"
                      disabled={packingId === first.id}
                      onClick={() => downloadPackingList(first.id)}
                    >
                      <FileText aria-hidden />
                    </Button>
                  </div>
                </header>
                <ul className="divide-y">
                  {items.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/materiel/${r.materiel.id}`}
                          className="font-semibold text-foreground hover:text-primary-text"
                        >
                          {r.materiel.nom}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          S/N {r.materiel.numeroSerie} ·{" "}
                          {r.utilisateur ? fullName(r.utilisateur) : "Deleted account"}
                        </p>
                        {r.remarqueRetour && (
                          <p className="truncate text-xs text-slate" title={r.remarqueRetour}>
                            “{r.remarqueRetour}”
                          </p>
                        )}
                      </div>
                      <StatusBadge value={r.statut} config={statutReservationConfig} />
                      <ReservationActions reservation={r} currentUser={currentUser} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <Sheet
        open={selectedReservation !== null}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
      >
        <SheetContent>
          {selectedReservation && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedReservation.seance.titre}</SheetTitle>
                <SheetDescription>
                  {selectedReservation.materiel.nom} ·{" "}
                  {statutReservationConfig[selectedReservation.statut].label}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 text-sm">
                <p>
                  <strong>When:</strong> {formatDate(selectedReservation.dateDebut)}{" "}
                  {formatTime(selectedReservation.dateDebut)} —{" "}
                  {formatDate(selectedReservation.dateFin)}{" "}
                  {formatTime(selectedReservation.dateFin)}
                </p>
                <p>
                  <strong>Reserved by:</strong>{" "}
                  {selectedReservation.utilisateur
                    ? fullName(selectedReservation.utilisateur)
                    : "Deleted account"}
                </p>
                {selectedReservation.seance.clientNom && (
                  <p>
                    <strong>Client:</strong> {selectedReservation.seance.clientNom}
                  </p>
                )}
                <ReservationActions reservation={selectedReservation} currentUser={currentUser} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function GanttRow({
  label,
  reservations,
  days,
  now,
  onSelect,
}: {
  label: string;
  reservations: Reservation[];
  days: Date[];
  now: number;
  onSelect: (reservation: Reservation) => void;
}) {
  return (
    <div
      className="grid min-h-16 border-b"
      style={{ gridTemplateColumns: `12rem repeat(${days.length}, ${HOUR_WIDTH}px)` }}
    >
      <div
        className="sticky left-0 z-10 flex items-center truncate border-r bg-card px-3 text-xs font-semibold text-foreground"
        title={label}
      >
        {label}
      </div>
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={cn(
            "relative border-r bg-surface/40",
            (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/30",
          )}
        >
          <div className="absolute inset-y-0 left-1/4 border-l border-dashed border-border/50" />
          {sameDay(day, new Date(now)) &&
            (() => {
              const start = new Date(day);
              start.setHours(DAY_START, 0, 0, 0);
              const end = new Date(day);
              end.setHours(DAY_END, 0, 0, 0);
              const position = ((now - start.getTime()) / (end.getTime() - start.getTime())) * 100;
              return position >= 0 && position <= 100 ? (
                <div
                  className="absolute inset-y-0 z-30 border-l-2 border-red-500"
                  style={{ left: `${position}%` }}
                  title="Now"
                />
              ) : null;
            })()}
          {reservations.map((reservation) => {
            const segment = segmentForDay(reservation, day);
            if (!segment) return null;
            return (
              <button
                key={`${reservation.id}-${day.toISOString()}`}
                type="button"
                className={cn(
                  "absolute top-2 z-10 h-12 min-w-2 overflow-hidden rounded-md border px-2 text-left text-[11px] font-semibold shadow-sm transition hover:z-20 hover:ring-2 hover:ring-ring focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  barTone(reservation, now),
                )}
                style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                onClick={() => onSelect(reservation)}
                title={`${reservation.seance.titre} · ${formatTime(reservation.dateDebut)}–${formatTime(reservation.dateFin)} · ${statutReservationConfig[reservation.statut].label}`}
              >
                <span className="block truncate">{reservation.seance.titre}</span>
                {segment.width > 18 && (
                  <span className="block truncate text-[10px] font-normal">
                    {formatTime(reservation.dateDebut)}–{formatTime(reservation.dateFin)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
