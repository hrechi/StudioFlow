"use client";

import { Loader2, ScanSearch, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AIBadge } from "@/components/shared/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Photo } from "../galerie.types";
import { searchPhotosAction } from "../photo-ai.actions";

/**
 * /dashboard/photos/recherche — natural-language search. The query goes to the server, where
 * Claude Haiku reads the AI descriptions and tags of the analysed photos and returns the matches
 * (photo-ai.service.ts → searchPhotos). The refine chips filter the results by their AI tags.
 */
export function AISearch({
  photos,
  exemple,
  initialQuery,
}: {
  photos: Photo[];
  exemple: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; relevance: number }[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refine, setRefine] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(1);

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const results = useMemo(
    () =>
      found
        .map(({ id, relevance }) => ({ photo: byId.get(id), pertinence: relevance }))
        .filter((r): r is { photo: Photo; pertinence: number } => !!r.photo)
        .filter((r) => refine.size === 0 || [...refine].every((t) => r.photo.tagsIA.includes(t))),
    [found, byId, refine],
  );
  // Refine chips: the most frequent AI tags among the matches.
  const refineGroups = useMemo<Record<string, string[]>>(() => {
    const counts = new Map<string, number>();
    for (const { id } of found) {
      for (const tag of byId.get(id)?.tagsIA ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    const groups: Record<string, string[]> = {};
    if (top.length) groups["Top tags"] = top;
    return groups;
  }, [found, byId]);

  const perPage = 12;
  const pageCount = Math.max(1, Math.ceil(results.length / perPage));
  const visible = results.slice((page - 1) * perPage, page * perPage);

  const search = (value = query) => {
    const text = value.trim();
    if (text.length < 2) return;
    startTransition(async () => {
      const result = await searchPhotosAction({ query: text });
      setPage(1);
      setRefine(new Set());
      if (!result.ok) {
        setError(result.error);
        setFound([]);
        setTerms([]);
        setSubmitted(text);
        return;
      }
      setError(null);
      setFound(result.data.matches);
      setTerms(result.data.understood);
      setSubmitted(text);
    });
  };

  // "Similar photos" links open this page with ?q=…: search right away, once.
  const autoRan = useRef(false);
  useEffect(() => {
    if (initialQuery && !autoRan.current) {
      autoRan.current = true;
      search(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

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
            placeholder={`e.g. ${exemple}`}
            className="h-12 border-none bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6" disabled={pending || !query.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ScanSearch aria-hidden />}
          Search
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
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
                    : error
                      ? error
                      : submitted === null
                        ? "Describe the photo you need and press Search."
                        : `${results.length} photos match “${submitted}”`}
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
                icon={submitted === null ? ScanSearch : SearchX}
                title={submitted === null ? "Search your photos in plain words" : "No results"}
                description={
                  submitted === null
                    ? "The AI reads what is in each analysed photo: people, place, mood, light…"
                    : "Try a simpler description or remove some filters."
                }
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
            {Object.entries(refineGroups).map(([group, values]) => (
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
