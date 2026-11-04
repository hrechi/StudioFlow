"use client";

import { Info, MessagesSquare, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatRelative } from "@/lib/utils";
import {
  reclamationHref,
  statutReclamationConfig,
  type Reclamation,
  type StatutReclamation,
} from "../avis.types";
import { ReclamationChat, StudioMark } from "./reclamation-chat";

const FILTERS = {
  all: { label: "All", match: () => true },
  active: { label: "Active", match: (s: StatutReclamation) => s === "OUVERTE" || s === "EN_COURS" },
  closed: { label: "Closed", match: (s: StatutReclamation) => s === "RESOLUE" || s === "REJETEE" },
} as const;
type Filter = keyof typeof FILTERS;

const STATUS_DOTS: Record<StatutReclamation, string> = {
  OUVERTE: "bg-warning",
  EN_COURS: "bg-primary",
  RESOLUE: "bg-success",
  REJETEE: "bg-light-gray",
};

function preview(r: Reclamation, viewer: "client" | "staff"): string {
  const last = r.messages.filter((m) => !m.evenement).at(-1);
  if (!last) return r.description;
  const mine = (last.auteurRole === "CLIENT") === (viewer === "client");
  return `${mine ? "You: " : ""}${last.contenu}`;
}

/**
 * Messenger-style page for complaint conversations: the list on the left, the selected chat
 * filling the rest, and (staff) a details column. On phones the list and the chat are two views.
 */
export function ReclamationInbox({
  threads,
  selected,
  viewer,
  details,
}: {
  threads: Reclamation[];
  selected: Reclamation | null;
  viewer: "client" | "staff";
  /** Staff side panel (status, AI, actions): a column on wide screens, a sheet below. */
  details?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const indexHref =
    viewer === "client" ? "/espace-client/avis/reclamations" : "/dashboard/reclamations/inbox";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter(
      (r) =>
        FILTERS[filter].match(r.statut) &&
        (!q ||
          r.objet.toLowerCase().includes(q) ||
          fullName(r.client).toLowerCase().includes(q) ||
          r.seance.titre.toLowerCase().includes(q)),
    );
  }, [threads, query, filter]);

  return (
    <Card
      className={cn(
        "grid h-[calc(100dvh-12rem)] min-h-[34rem] gap-0 overflow-hidden py-0",
        "md:grid-cols-[19rem_minmax(0,1fr)]",
        details && selected && "xl:grid-cols-[19rem_minmax(0,1fr)_20rem]",
      )}
    >
      <aside
        className={cn("min-h-0 flex-col border-r", selected ? "hidden md:flex" : "flex")}
        aria-label="Conversations"
      >
        <div className="space-y-3 border-b p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={viewer === "staff" ? "Search subject or client…" : "Search…"}
              aria-label="Search conversations"
              className="h-9 rounded-full bg-surface pl-8"
            />
          </div>
          <div className="flex gap-1" role="group" aria-label="Filter conversations">
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {FILTERS[key].label}
              </button>
            ))}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">No conversations.</li>
          )}
          {visible.map((r) => {
            const active = r.id === selected?.id;
            const person = viewer === "client" ? r.traitePar : r.client;
            return (
              <li key={r.id}>
                <Link
                  href={reclamationHref(r.id, viewer)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex gap-3 border-b border-border/60 px-3 py-3 transition-colors",
                    active ? "bg-accent" : "hover:bg-surface",
                  )}
                >
                  <span className="relative shrink-0">
                    {person ? <UserAvatar {...person} /> : <StudioMark />}
                    <span
                      className={cn(
                        "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
                        STATUS_DOTS[r.statut],
                      )}
                      title={statutReclamationConfig[r.statut].label}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {viewer === "staff" ? fullName(r.client) : r.objet}
                      </span>
                      <span className="ml-auto shrink-0 text-[0.65rem] text-muted-foreground">
                        {formatRelative(r.derniereActivite)}
                      </span>
                    </span>
                    {viewer === "staff" && (
                      <span className="flex items-center gap-1 truncate text-xs font-medium text-slate">
                        {r.escaladeIA && r.statut !== "RESOLUE" && r.statut !== "REJETEE" && (
                          <TriangleAlert
                            className="size-3.5 shrink-0 text-ai"
                            aria-label="AI: frustration rising"
                          />
                        )}
                        <span className="truncate">{r.objet}</span>
                      </span>
                    )}
                    <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {preview(r, viewer)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <div
        className={cn("min-h-0 min-w-0", selected ? "flex flex-col" : "hidden md:flex md:flex-col")}
      >
        {selected ? (
          <ReclamationChat
            key={selected.id}
            reclamation={selected}
            viewer={viewer}
            backHref={indexHref}
            headerActions={
              details && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Details">
                      <Info aria-hidden />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
                    <SheetHeader className="border-b">
                      <SheetTitle>Details</SheetTitle>
                      <SheetDescription>{selected.objet}</SheetDescription>
                    </SheetHeader>
                    {details}
                  </SheetContent>
                </Sheet>
              )
            }
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface/50 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-card ring-1 ring-border">
              <MessagesSquare className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <p className="font-medium text-foreground">Select a conversation</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {threads.length
                ? "Pick a complaint on the left to read and answer its messages."
                : viewer === "client"
                  ? "You have no complaints yet — file one from Reviews & complaints."
                  : "No complaints have been filed yet."}
            </p>
          </div>
        )}
      </div>

      {details && selected && (
        <div className="hidden min-h-0 overflow-y-auto border-l xl:block">{details}</div>
      )}
    </Card>
  );
}
