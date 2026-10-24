"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fullName } from "@/lib/mock-data-helpers";
import { cn } from "@/lib/utils";
import { statutSeanceReelConfig, type SeanceDTO, type StatutSeanceReel } from "../seance.dto";

const TZ = "Africa/Tunis";
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string | Date) => keyFmt.format(typeof iso === "string" ? new Date(iso) : iso);
const toUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (key: string, n: number) => {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (key: string) => addDays(key, -((toUtc(key).getUTCDay() + 6) % 7));
const label = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(toUtc(key));

type View = "month" | "week" | "day";
const VIEWS: { value: View; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const chipColor: Record<StatutSeanceReel, string> = {
  DEMANDE_RECUE: "border-l-amber-500 bg-amber-500/10",
  EN_ATTENTE_CONFIRMATION: "border-l-amber-500 bg-amber-500/10",
  CONFIRMEE: "border-l-sky-500 bg-sky-500/10",
  EN_COURS: "border-l-violet-500 bg-violet-500/10",
  TERMINEE: "border-l-emerald-500 bg-emerald-500/10",
  REPORTEE: "border-l-zinc-400 bg-zinc-500/10",
  ANNULEE: "border-l-zinc-400 bg-zinc-500/10",
};

const needsTeam = (s: SeanceDTO) =>
  s.equipe.length === 0 && (s.statut === "CONFIRMEE" || s.statut === "EN_ATTENTE_CONFIRMATION");

function Chip({ s, canEdit }: { s: SeanceDTO; canEdit: boolean }) {
  const body = (
    <span
      className={cn("flex items-center gap-1 truncate rounded border-l-2 px-1.5 py-0.5 text-xs", chipColor[s.statut])}
      title={`${timeFmt.format(new Date(s.dateDebut))} ${s.titre}`}
    >
      {needsTeam(s) && <AlertTriangle className="size-3 shrink-0 text-amber-600" aria-label="No team assigned" />}
      <span className="font-medium tabular-nums">{timeFmt.format(new Date(s.dateDebut))}</span>
      <span className="truncate">{s.titre}</span>
    </span>
  );
  return canEdit ? <Link href={`/dashboard/seances/${s.id}`} className="block">{body}</Link> : body;
}

function DayList({ items, canEdit }: { items: SeanceDTO[]; canEdit: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing planned.</p>;
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.id} className={cn("rounded-lg border-l-4 p-3", chipColor[s.statut])}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              {canEdit ? (
                <Link href={`/dashboard/seances/${s.id}`} className="font-medium text-foreground hover:underline">{s.titre}</Link>
              ) : (
                <p className="font-medium text-foreground">{s.titre}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {timeFmt.format(new Date(s.dateDebut))} – {timeFmt.format(new Date(s.dateFin))} · {s.typeEvenement.nom}
                {s.pack ? ` · ${s.pack.nom}` : ""}
              </p>
            </div>
            <StatusBadge value={s.statut} config={statutSeanceReelConfig} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {s.lieu}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.equipe.length ? `Team: ${s.equipe.map((m) => fullName(m.employe)).join(", ")}` : "No team assigned yet"}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function PlanningCalendar({ seances, nowIso, canEdit }: { seances: SeanceDTO[]; nowIso: string; canEdit: boolean }) {
  const today = dayKey(nowIso);
  const [view, setView] = useState<View>("month");
  const [focus, setFocus] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, SeanceDTO[]>();
    for (const s of seances) {
      if (s.statut === "ANNULEE") continue;
      const k = dayKey(s.dateDebut);
      map.set(k, [...(map.get(k) ?? []), s].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)));
    }
    return map;
  }, [seances]);

  const step = (dir: 1 | -1) => {
    if (view === "day") setFocus(addDays(focus, dir));
    else if (view === "week") setFocus(addDays(focus, 7 * dir));
    else {
      const d = toUtc(focus);
      d.setUTCMonth(d.getUTCMonth() + dir, 1);
      setFocus(d.toISOString().slice(0, 10));
    }
  };

  const title =
    view === "month"
      ? label(focus, { month: "long", year: "numeric" })
      : view === "week"
        ? `${label(mondayOf(focus), { day: "numeric", month: "short" })} – ${label(addDays(mondayOf(focus), 6), { day: "numeric", month: "short", year: "numeric" })}`
        : label(focus, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(focus), i));
  const monthStart = `${focus.slice(0, 7)}-01`;
  const gridStart = mondayOf(monthStart);
  const monthCells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft aria-hidden /></Button>
          <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Next"><ChevronRight aria-hidden /></Button>
          <Button variant="outline" size="sm" onClick={() => setFocus(today)}>Today</Button>
          <h2 className="ml-2 text-lg font-semibold capitalize text-foreground" aria-live="polite">{title}</h2>
        </div>
        <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <Button key={v.value} size="sm" variant={view === v.value ? "default" : "ghost"}
              aria-pressed={view === v.value} onClick={() => setView(v.value)}>
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {weekDays.map((d) => <div key={d} className="py-2">{label(d, { weekday: "short" })}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((k) => {
              const items = byDay.get(k) ?? [];
              const inMonth = k.slice(0, 7) === focus.slice(0, 7);
              return (
                <div key={k} className={cn("min-h-24 space-y-1 border-b border-r p-1.5", !inMonth && "bg-muted/30 text-muted-foreground")}>
                  <button type="button" onClick={() => { setFocus(k); setView("day"); }}
                    className={cn("flex size-6 items-center justify-center rounded-full text-xs hover:bg-muted",
                      k === today && "bg-primary font-semibold text-primary-foreground hover:bg-primary")}
                    aria-label={`Open ${label(k, { day: "numeric", month: "long" })}`}>
                    {Number(k.slice(8))}
                  </button>
                  {items.slice(0, 3).map((s) => <Chip key={s.id} s={s} canEdit={canEdit} />)}
                  {items.length > 3 && (
                    <button type="button" className="text-xs text-muted-foreground hover:underline"
                      onClick={() => { setFocus(k); setView("day"); }}>
                      +{items.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((k) => (
            <Card key={k} className={cn("space-y-2 p-3", k === today && "ring-2 ring-primary")}>
              <button type="button" className="text-left text-sm font-medium text-foreground hover:underline"
                onClick={() => { setFocus(k); setView("day"); }}>
                {label(k, { weekday: "short", day: "numeric" })}
              </button>
              {(byDay.get(k) ?? []).map((s) => <Chip key={s.id} s={s} canEdit={canEdit} />)}
              {!(byDay.get(k) ?? []).length && <p className="text-xs text-muted-foreground">—</p>}
            </Card>
          ))}
        </div>
      )}

      {view === "day" && (
        <Card className="p-4">
          <DayList items={byDay.get(focus) ?? []} canEdit={canEdit} />
        </Card>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />
        marks a pending or confirmed session with no team assigned.
      </p>
    </div>
  );
}
