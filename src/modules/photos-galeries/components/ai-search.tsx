"use client";

import { Loader2, ScanSearch, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Photo } from "../galerie.types";

const REFINE = {
  People: ["bride", "couple", "guests", "portrait"],
  Location: ["outdoors", "studio", "garden", "beach"],
  Mood: ["smile", "laughing", "sunset", "natural light"],
} as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "who",
  "that",
  "are",
  "for",
  "from",
  "photos",
  "photo",
  "show",
  "some",
  "all",
]);

/** Fake "understanding" of the query: keeps meaningful words (the real module calls the AI API). */
function extractTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 6);
}

/** /dashboard/photos/recherche — natural-language search (AI Search screenshot layout). */
export function AISearch({ photos, exemple }: { photos: Photo[]; exemple: string }) {
  const [query, setQuery] = useState(exemple);
  const [submitted, setSubmitted] = useState(exemple);
  const [refine, setRefine] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(1);

  const terms = useMemo(() => extractTerms(submitted), [submitted]);

  const results = useMemo(() => {
    const wanted = [...terms, ...refine];
    return photos
      .filter((p) => p.statutCulling !== "REJETEE")
      .map((photo) => {
        const haystack = photo.tagsIA.join(" ");
        const hits = wanted.filter(
          (t) => haystack.includes(t) || t.includes(photo.tagsIA[0] ?? "~"),
        ).length;
        return {
          photo,
          pertinence: Math.min(0.99, 0.55 + hits * 0.15 + photo.scoreQualite / 1000),
        };
      })
      .filter((r) => refine.size === 0 || [...refine].every((t) => r.photo.tagsIA.includes(t)))
      .sort((a, b) => b.pertinence - a.pertinence);
  }, [photos, terms, refine]);

  const perPage = 12;
  const pageCount = Math.max(1, Math.ceil(results.length / perPage));
  const visible = results.slice((page - 1) * perPage, page * perPage);

  const search = (value = query) =>
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450)); // simulates the AI call
      setSubmitted(value);
      setPage(1);
    });

  const toggleRefine = (term: string) =>
    setRefine((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col gap-2 rounded-2xl bg-card p-2 shadow-soft ring-1 ring-ai/20 sm:flex-row"
      >
        <div className="relative flex-1">
          <Sparkles
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ai"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Describe the photos you are looking for"
            placeholder="e.g. the bride laughing outdoors at sunset"
            className="h-12 border-none bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6" disabled={pending || !query.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ScanSearch aria-hidden />}
          Search
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <Card className="min-w-0 gap-0 py-0">
          <div className="space-y-3 border-b p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-foreground">
                  AI search results <AIBadge />
                </h2>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {pending
                    ? "Analyzing your description…"
                    : `${results.length} photos match your description`}
                </p>
              </div>
            </div>
            {terms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Understood:</span>
                {terms.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-ai-soft px-2.5 py-0.5 text-xs font-medium text-ai-text ring-1 ring-ai/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={cn("p-4 transition-opacity", pending && "opacity-50")}>
            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No results"
                description="Try a simpler description or remove some filters."
              />
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map(({ photo, pertinence }) => (
                  <li
                    key={photo.id}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                  >
                    <SafeImage
                      src={photo.urlMiniature}
                      alt={photo.tagsIA.join(", ")}
                      fill
                      sizes="(min-width: 1280px) 20vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.7rem] font-bold text-ai-text shadow-sm backdrop-blur-sm">
                      {Math.round(pertinence * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="Results pagination"
              className="flex items-center justify-between border-t px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">
                {(page - 1) * perPage + 1}–{Math.min(page * perPage, results.length)} of{" "}
                {results.length}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg font-medium",
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "text-slate hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </Card>

        <Card className="gap-0 self-start py-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="size-4" aria-hidden />
              Refine
            </p>
            {refine.size > 0 && (
              <Button variant="ghost" size="xs" onClick={() => setRefine(new Set())}>
                <X aria-hidden />
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-4 p-4">
            {Object.entries(REFINE).map(([group, values]) => (
              <fieldset key={group} className="space-y-1.5">
                <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group}
                </legend>
                {values.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate"
                  >
                    <input
                      type="checkbox"
                      checked={refine.has(value)}
                      onChange={() => toggleRefine(value)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="capitalize">{value}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
