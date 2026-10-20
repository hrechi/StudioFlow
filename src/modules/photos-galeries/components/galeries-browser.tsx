"use client";

import { ChevronRight, FolderSearch } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/filters";
import { cn } from "@/lib/utils";
import { fullName } from "@/lib/mock-data-helpers";
import {
  GALERIE_PIPELINE,
  statutGalerieConfig,
  type Galerie,
  type StatutGalerie,
} from "../galerie.types";
import { GalerieCard } from "./galerie-card";

/** Galleries grouped by lifecycle: EN_TRI → PARTAGEE → VALIDEE → LIVREE. */
export function GaleriesBrowser({ galeries }: { galeries: Galerie[] }) {
  const [statut, setStatut] = useState<StatutGalerie | null>(null);
  const [query, setQuery] = useState("");

  const list = galeries
    .filter((g) => !statut || g.statut === statut)
    .filter((g) =>
      `${g.titre} ${fullName(g.client)}`.toLowerCase().includes(query.trim().toLowerCase()),
    );

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Gallery lifecycle">
        {GALERIE_PIPELINE.map((step, index) => {
          const count = galeries.filter((g) => g.statut === step).length;
          const active = statut === step;
          return (
            <li key={step} className="relative">
              <button
                type="button"
                onClick={() => setStatut(active ? null : step)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left shadow-soft ring-1 transition-colors",
                  active ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40",
                )}
              >
                <span className="grid size-9 place-items-center rounded-full bg-surface text-sm font-bold text-slate">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">
                    {statutGalerieConfig[step].label}
                  </span>
                  <span className="block text-xl font-bold text-foreground">{count}</span>
                </span>
              </button>
              {index < GALERIE_PIPELINE.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="absolute top-1/2 -right-3 z-10 hidden size-5 -translate-y-1/2 text-light-gray lg:block"
                />
              )}
            </li>
          );
        })}
      </ol>

      <SearchInput
        value={query}
        onChange={setQuery}
        label="Search galleries"
        placeholder="Search a gallery or a client…"
        className="max-w-md"
      />

      {list.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title="No galleries"
          description={
            galeries.length === 0
              ? "Create a gallery for a client, then import its photos."
              : "No gallery matches these criteria."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((galerie) => (
            <GalerieCard
              key={galerie.id}
              galerie={galerie}
              href={`/dashboard/galeries/${galerie.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
