"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import type { Seance, StatutSeance } from "../seance.types";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

const chipTone: Record<StatutSeance, string> = {
  PLANIFIEE: "bg-accent text-primary-text border-primary/30",
  CONFIRMEE: "bg-success/10 text-success-text border-success/30",
  TERMINEE: "bg-muted text-slate border-border",
  ANNULEE: "bg-destructive/10 text-destructive-text border-destructive/25 line-through",
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Month calendar of séances (status colors + labels, so color is not the only cue). */
export function SeanceCalendar({ seances, baseHref }: { seances: Seance[]; baseHref: string }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Seance[]>();
    for (const seance of seances) {
      const key = dayKey(new Date(seance.dateDebut));
      map.set(key, [...(map.get(key) ?? []), seance]);
    }
    return map;
  }, [seances]);

  const todayKey = dayKey(new Date());
  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground capitalize">
          {monthFormatter.format(cursor)}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => move(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="Next month">
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[44rem] grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="bg-surface px-2 py-2 text-xs font-semibold text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const key = dayKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const items = byDay.get(key) ?? [];
            return (
              <div key={key} className={cn("min-h-28 bg-card p-1.5", !inMonth && "bg-surface/70")}>
                <span
                  className={cn(
                    "mb-1 grid size-6 place-items-center rounded-full text-xs font-medium",
                    key === todayKey
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-slate"
                        : "text-muted-foreground/60",
                  )}
                >
                  {day.getDate()}
                </span>
                <ul className="space-y-1">
                  {items.map((seance) => (
                    <li key={seance.id}>
                      <Link
                        href={`${baseHref}/${seance.id}`}
                        className={cn(
                          "block truncate rounded-md border px-1.5 py-1 text-[0.7rem] leading-tight font-medium transition-opacity hover:opacity-80",
                          chipTone[seance.statut],
                        )}
                        title={seance.titre}
                      >
                        <span className="font-semibold">{formatTime(seance.dateDebut)}</span>{" "}
                        {seance.titre}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
