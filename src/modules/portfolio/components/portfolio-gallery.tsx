"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ElementPortfolio } from "../portfolio.types";

// Alternating ratios give the masonry rhythm (photos are cropped to these frames).
const RATIOS = [
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/2]",
  "aspect-[2/3]",
];

/** Public masonry gallery + lightbox (keyboard: ← → Échap). */
export function PortfolioGallery({
  elements,
  titre,
}: {
  elements: ElementPortfolio[];
  titre: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? i : (i + delta + elements.length) % elements.length)),
    [elements.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const current = open === null ? null : elements[open];

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {elements.map((element, index) => (
          <li key={element.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group relative block w-full overflow-hidden rounded-xl bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
              aria-label={`Enlarge: ${element.legende}`}
            >
              <div className={cn("relative", RATIOS[index % RATIOS.length])}>
                <SafeImage
                  src={element.photo.url}
                  alt={element.legende}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-charcoal/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <p className="flex-1 text-left text-sm font-medium text-white">{element.legende}</p>
                <Expand className="size-4 text-white" aria-hidden />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-w-[min(96vw,80rem)] gap-0 border-none bg-charcoal p-0 text-white sm:max-w-[min(96vw,80rem)] [&>button]:text-white [&>button]:hover:bg-white/10">
          <DialogTitle className="sr-only">{titre}</DialogTitle>
          <DialogDescription className="sr-only">
            Enlarged photo, use the arrow keys to navigate.
          </DialogDescription>
          {current && (
            <figure>
              <div className="relative h-[75vh] w-full">
                <SafeImage
                  src={current.photo.url}
                  alt={current.legende}
                  fill
                  sizes="96vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <span className="text-white/85">{current.legende}</span>
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
