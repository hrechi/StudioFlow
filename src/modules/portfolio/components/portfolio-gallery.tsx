"use client";

import { ChevronLeft, ChevronRight, Expand, Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ElementPortfolioPublic, MiseEnPage } from "../portfolio.types";

const RATIOS = [
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/2]",
  "aspect-[2/3]",
];

export function PortfolioGallery({
  elements,
  titre,
  portfolioId,
  slug,
  miseEnPage = "MASONRY",
  colonnes = 3,
  espacement = 16,
}: {
  elements: ElementPortfolioPublic[];
  titre: string;
  portfolioId: string;
  slug: string;
  miseEnPage?: MiseEnPage;
  colonnes?: number;
  espacement?: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeError, setLikeError] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const go = useCallback(
    (delta: number) =>
      setOpen((index) =>
        index === null ? index : (index + delta + elements.length) % elements.length,
      ),
    [elements.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const like = async (element: ElementPortfolioPublic) => {
    setLikeError(null);
    const response = await fetch(`/api/portfolio/${encodeURIComponent(slug)}/like`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portfolioId, elementId: element.idElement }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };
    if (!response.ok || !result.ok) {
      setLikeError(result.message ?? "Could not like this photo.");
      return;
    }
    setLiked((previous) => new Set(previous).add(element.idElement));
  };

  const current = open === null ? null : elements[open];
  const columnCount = miseEnPage === "PLEIN_ECRAN" ? 1 : Math.min(6, Math.max(1, colonnes));
  const gap = Math.min(100, Math.max(0, espacement));
  const masonry = miseEnPage === "MASONRY";
  const carousel = miseEnPage === "CARROUSEL";
  return (
    <>
      <ul
        className={cn(
          masonry && "columns-1 sm:columns-2 lg:columns-3 [&>li]:mb-4",
          carousel && "flex snap-x snap-mandatory overflow-x-auto",
        )}
        style={
          masonry
            ? { columnCount, columnGap: gap }
            : carousel
              ? { display: "flex", gap, overflowX: "auto" }
              : {
                  display: "grid",
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  gap,
                }
        }
      >
        {elements.map((element, index) => (
          <li
            key={element.idElement}
            className={cn("break-inside-avoid", carousel && "snap-start")}
            style={
              carousel
                ? { flex: `0 0 calc((100% - ${gap * (columnCount - 1)}px) / ${columnCount})` }
                : undefined
            }
          >
            <figure className="group relative overflow-hidden bg-card">
              <button
                type="button"
                onClick={() => setOpen(index)}
                className="relative block w-full focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Enlarge: ${element.texteAlt || element.legende || titre}`}
              >
                <div className={cn("relative", RATIOS[index % RATIOS.length])}>
                  <SafeImage
                    src={element.media.urlMiniature || element.media.url}
                    alt={element.texteAlt || element.legende || "Portfolio photo"}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <p className="flex-1 text-left text-xs text-white">{element.legende}</p>
                  <Expand className="size-4 text-white" aria-hidden />
                </div>
              </button>
              <button
                type="button"
                onClick={() => void like(element)}
                disabled={liked.has(element.idElement)}
                aria-label="Like photo"
                className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-2 text-xs text-white backdrop-blur transition hover:bg-black/80 disabled:text-pink-300"
              >
                <Heart
                  className={cn("size-4", liked.has(element.idElement) && "fill-current")}
                  aria-hidden
                />
                {element.nombreLikes + Number(liked.has(element.idElement))}
              </button>
            </figure>
          </li>
        ))}
      </ul>
      {likeError && (
        <p role="status" className="mt-3 text-sm text-destructive">
          {likeError}
        </p>
      )}
      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-w-[min(96vw,80rem)] gap-0 border-none bg-charcoal p-0 text-white sm:max-w-[min(96vw,80rem)] [&>button]:text-white [&>button]:hover:bg-white/10">
          <DialogTitle className="sr-only">{titre}</DialogTitle>
          <DialogDescription className="sr-only">
            Enlarged photo. Use the arrow keys to navigate.
          </DialogDescription>
          {current && (
            <figure
              onTouchStart={(event) => {
                touchStart.current = event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const end = event.changedTouches[0]?.clientX;
                if (
                  touchStart.current !== null &&
                  end !== undefined &&
                  Math.abs(end - touchStart.current) > 50
                )
                  go(end < touchStart.current ? 1 : -1);
                touchStart.current = null;
              }}
            >
              <div className="relative h-[75vh] w-full">
                <SafeImage
                  src={current.media.url}
                  alt={current.texteAlt || current.legende || "Portfolio photo"}
                  fill
                  unoptimized
                  sizes="96vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <span>{current.legende}</span>
                <span className="shrink-0 text-white/60">
                  {(open ?? 0) + 1} / {elements.length}
                </span>
              </figcaption>
            </figure>
          )}
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/25 hover:text-white"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/25 hover:text-white"
          >
            <ChevronRight aria-hidden />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
