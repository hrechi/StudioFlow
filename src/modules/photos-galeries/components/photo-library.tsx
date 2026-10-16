"use client";

import {
  Check,
  FolderOpen,
  FolderPlus,
  ImageOff,
  LayoutGrid,
  Plus,
  Rows3,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  statutCullingConfig,
  type Galerie,
  type Photo,
  type StatutCulling,
} from "../galerie.types";
import { PhotoDetailPanel } from "./photo-detail-panel";
import { PhotoThumb } from "./photo-thumb";

const CATEGORIES = ["All", "Wedding", "Portrait", "Product", "Event"] as const;
const AI_FILTERS = {
  floues: "Blurry",
  yeux: "Eyes closed",
  doublons: "Duplicates",
  top: "Score ≥ 85",
} as const;
type AiFilter = keyof typeof AI_FILTERS;
const SORTS = { recent: "Most recent", score: "Best score" } as const;

/** /dashboard/photos — photo library (Photo Library screenshot layout). */
export function PhotoLibrary({
  photos,
  galeries,
  tags,
}: {
  photos: Photo[];
  galeries: Pick<Galerie, "id" | "titre" | "categorie">[];
  tags: string[];
}) {
  const [categorie, setCategorie] = useState<(typeof CATEGORIES)[number]>("All");
  const [galerie, setGalerie] = useState<string>(ALL);
  const [ai, setAi] = useState<AiFilter | typeof ALL>(ALL);
  const [culling, setCulling] = useState<StatutCulling | typeof ALL>(ALL);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<keyof typeof SORTS>("recent");
  const [dense, setDense] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(photos[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const galerieCategory = useMemo(
    () => new Map(galeries.map((g) => [g.id, g.categorie])),
    [galeries],
  );

  const filtered = useMemo(() => {
    const list = photos
      .filter((p) => categorie === "All" || galerieCategory.get(p.galerieId) === categorie)
      .filter((p) => galerie === ALL || p.galerieId === galerie)
      .filter((p) => culling === ALL || p.statutCulling === culling)
      .filter((p) => !tag || p.tagsIA.includes(tag))
      .filter((p) => {
        if (ai === "floues") return p.estFloue;
        if (ai === "yeux") return p.yeuxFermes;
        if (ai === "doublons") return !!p.groupeDoublon;
        if (ai === "top") return p.scoreQualite >= 85;
        return true;
      });
    return sort === "score" ? [...list].sort((a, b) => b.scoreQualite - a.scoreQualite) : list;
  }, [photos, categorie, galerie, culling, tag, ai, sort, galerieCategory]);

  const active = photos.find((p) => p.id === activeId) ?? null;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of photos) map.set(p.galerieId, (map.get(p.galerieId) ?? 0) + 1);
    return map;
  }, [photos]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={categorie === c}
            onClick={() => setCategorie(c)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              categorie === c
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-slate ring-1 ring-border hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_20rem]">
        {/* Galleries + tags */}
        <Card className="hidden gap-0 self-start py-0 lg:flex">
          <div className="border-b p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Galleries
            </p>
            <ul className="space-y-0.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setGalerie(ALL)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
                    galerie === ALL
                      ? "bg-accent font-semibold text-primary-text"
                      : "text-slate hover:bg-muted",
                  )}
                >
                  <FolderOpen className="size-4" aria-hidden />
                  <span className="flex-1 text-left">All photos</span>
                  <span className="text-xs text-muted-foreground">{photos.length}</span>
                </button>
              </li>
              {galeries.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setGalerie(g.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
                      galerie === g.id
                        ? "bg-accent font-semibold text-primary-text"
                        : "text-slate hover:bg-muted",
                    )}
                  >
                    <FolderOpen className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate text-left">{g.titre}</span>
                    <span className="text-xs text-muted-foreground">{counts.get(g.id) ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => comingSoon("Create a gallery")}
              className="mt-2 flex items-center gap-1.5 px-2 text-sm font-medium text-primary-text hover:underline"
            >
              <Plus className="size-4" aria-hidden />
              New gallery
            </button>
          </div>
          <div className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Tags <Sparkles className="size-3 text-ai" aria-label="generated by the AI" />
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  aria-pressed={tag === t}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    tag === t ? "bg-ai text-white" : "bg-ai-soft text-ai-text hover:bg-ai/15",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Grid */}
        <Card className="min-w-0 gap-0 py-0">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm whitespace-nowrap text-slate">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)))
                  }
                  className="size-4 accent-[var(--primary)]"
                />
                Select all
              </label>
              <span className="text-sm whitespace-nowrap text-muted-foreground">
                {filtered.length} photos
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={ai}
                onChange={setAi}
                options={AI_FILTERS}
                allLabel="AI analysis: all"
                label="Filter by AI analysis"
                className="w-40"
              />
              <FilterSelect
                value={culling}
                onChange={setCulling}
                options={
                  Object.fromEntries(
                    Object.entries(statutCullingConfig).map(([k, v]) => [k, v.label]),
                  ) as Record<StatutCulling, string>
                }
                allLabel="Culling: all"
                label="Filter by culling"
                className="w-36"
              />
              <div className="lg:hidden">
                <FilterSelect
                  value={galerie}
                  onChange={setGalerie}
                  options={Object.fromEntries(galeries.map((g) => [g.id, g.titre]))}
                  allLabel="All galleries"
                  label="Filter by gallery"
                  className="w-44"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as keyof typeof SORTS)}>
                <SelectTrigger className="h-9 w-36 bg-white" aria-label="Sort">
                  <SelectValue>{SORTS[sort]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SORTS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex rounded-lg ring-1 ring-border" role="group" aria-label="View">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={!dense}
                  aria-label="Large thumbnails"
                  onClick={() => setDense(false)}
                  className={cn(!dense && "bg-accent text-primary-text")}
                >
                  <LayoutGrid aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={dense}
                  aria-label="Compact thumbnails"
                  onClick={() => setDense(true)}
                  className={cn(dense && "bg-accent text-primary-text")}
                >
                  <Rows3 aria-hidden />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {filtered.length === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="No photos"
                description="No photo matches these filters."
              />
            ) : (
              <div
                className={cn(
                  "grid gap-3",
                  dense
                    ? "grid-cols-3 sm:grid-cols-4 xl:grid-cols-6"
                    : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
                )}
              >
                {filtered.map((photo) => (
                  <PhotoThumb
                    key={photo.id}
                    photo={photo}
                    selected={selected.has(photo.id)}
                    active={photo.id === activeId}
                    onToggle={() => toggle(photo.id)}
                    onOpen={() => {
                      setActiveId(photo.id);
                      if (window.matchMedia("(max-width: 1535px)").matches) setSheetOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Detail panel (desktop) */}
        <Card className="hidden self-start px-4 2xl:sticky 2xl:top-24 2xl:flex">
          {active ? (
            <PhotoDetailPanel photo={active} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a photo to see its analysis.
            </p>
          )}
        </Card>
      </div>

      {/* Detail panel (tablet / mobile) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-5 sm:max-w-sm"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Photo details</SheetTitle>
          <SheetDescription className="sr-only">Metadata and AI analysis</SheetDescription>
          {active && <PhotoDetailPanel photo={active} onClose={() => setSheetOpen(false)} />}
        </SheetContent>
      </Sheet>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:left-[4.5rem] lg:left-64"
          role="region"
          aria-label="Bulk actions"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-charcoal px-4 py-3 text-white shadow-lift">
            <span className="mr-1 text-sm font-semibold">{selected.size} selected</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => comingSoon("Keep the selection")}
            >
              <Check aria-hidden />
              Keep
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => comingSoon("Add to a gallery")}
            >
              <FolderPlus aria-hidden />
              Add to a gallery
            </Button>
            <Button size="sm" variant="ai" onClick={() => comingSoon("Run the AI analysis again")}>
              <Sparkles aria-hidden />
              Analyze
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#fca5a5] hover:bg-white/10 hover:text-[#fecaca]"
              onClick={() => comingSoon("Delete the photos")}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
            >
              <X aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
