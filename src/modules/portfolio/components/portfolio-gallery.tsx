"use client";

import { ChevronLeft, ChevronRight, Expand, Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  categoriePortfolioLabels,
  type CategoriePortfolio,
  type ElementPortfolioPublic,
  type MiseEnPage,
} from "../portfolio.types";

export function PortfolioGallery({
  elements,
  titre,
  portfolioId,
  slug,
  miseEnPage = "MASONRY",
  colonnes = 3,
  espacement = 16,
  enableLikes = true,
}: {
  elements: ElementPortfolioPublic[];
  titre: string;
  portfolioId: string;
  slug: string;
  miseEnPage?: MiseEnPage;
  colonnes?: number;
  espacement?: number;
  enableLikes?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeError, setLikeError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoriePortfolio | "TOUT">("TOUT");
  const touchStart = useRef<number | null>(null);
  const galleryRef = useRef<HTMLUListElement>(null);
  const categories = [
    ...new Set(elements.flatMap((element) => (element.categorie ? [element.categorie] : []))),
  ];
  const visibleElements =
    activeCategory === "TOUT"
      ? elements
      : elements.filter((element) => element.categorie === activeCategory);
  const go = useCallback(
    (delta: number) =>
      setOpen((index) =>
        index === null ? index : (index + delta + visibleElements.length) % visibleElements.length,
      ),
    [visibleElements.length],
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

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || typeof IntersectionObserver === "undefined") return;

    const items = [...gallery.querySelectorAll<HTMLElement>("[data-gallery-reveal]")];
    const belowFold = items.filter(
      (item) => item.getBoundingClientRect().top >= window.innerHeight,
    );
    if (belowFold.length === 0) return;

    belowFold.forEach((item) => {
      item.dataset.revealed = "false";
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -12% 0px" },
    );
    belowFold.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [visibleElements.length]);

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

  const current = open === null ? null : visibleElements[open];
  const columnCount = miseEnPage === "PLEIN_ECRAN" ? 1 : Math.min(6, Math.max(1, colonnes));
  const gap = Math.min(100, Math.max(0, espacement));
  const masonry = miseEnPage === "MASONRY";
  const carousel = miseEnPage === "CARROUSEL";
  const galleryStyle: CSSProperties & { "--portfolio-gallery-columns": number } = {
    ...(masonry
      ? { columnGap: gap }
      : carousel
        ? { display: "flex", gap, overflowX: "auto" }
        : { gap }),
    "--portfolio-gallery-columns": columnCount,
  };
  return (
    <>
      <div
        className="mb-6 flex flex-wrap items-center gap-2"
        role={categories.length > 1 ? "group" : undefined}
        aria-label={categories.length > 1 ? "Filtrer la galerie" : undefined}
      >
        {categories.length > 1
          ? (["TOUT", ...categories] as const).map((category) => {
            const selected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setActiveCategory(category);
                  setOpen(null);
                }}
                className="rounded-full border px-4 py-2 font-mono text-[9px] tracking-[0.12em] uppercase transition-colors"
                style={{
                  borderColor: selected ? "var(--portfolio-accent)" : "var(--portfolio-border)",
                  color: selected ? "var(--portfolio-bg)" : "var(--portfolio-muted)",
                  backgroundColor: selected ? "var(--portfolio-accent)" : "transparent",
                }}
              >
                {category === "TOUT" ? "Tout" : categoriePortfolioLabels[category]}
              </button>
            );
            })
          : null}
        <span
          className="ml-auto font-mono text-[9px]"
          style={{ color: "var(--portfolio-muted)" }}
          aria-live="polite"
        >
          {visibleElements.length} photo{visibleElements.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul
        ref={galleryRef}
        className={cn(
          masonry && "portfolio-gallery-masonry [&>li]:mb-4",
          !masonry && !carousel && "portfolio-gallery-grid",
          carousel && "flex snap-x snap-mandatory overflow-x-auto",
        )}
        style={galleryStyle}
      >
        {visibleElements.map((element, index) => {
          return (
            <li
              key={element.idElement}
              data-gallery-reveal
              className={cn(
                "gallery-reveal-item break-inside-avoid",
                carousel && "snap-start",
                !masonry && !carousel && element.estMisEnAvant && "sm:col-span-2",
              )}
              style={{
                transitionDelay: `${Math.min(index * 70, 350)}ms`,
                ...(carousel
                  ? { flex: `0 0 calc((100% - ${gap * (columnCount - 1)}px) / ${columnCount})` }
                  : {}),
              }}
            >
              <figure
                className="group relative overflow-hidden rounded-[18px] border bg-card transition-all duration-500 ease-out hover:z-20"
                style={{
                  perspective: "1000px",
                  transformStyle: "preserve-3d",
                  borderColor: "var(--portfolio-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(index)}
                  className="relative block w-full transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.04] group-hover:rotate-[0.6deg] focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Enlarge: ${element.texteAlt || element.legende || titre}`}
                >
                  <div
                    className="relative w-full"
                    style={{
                      aspectRatio: `${element.media.largeur} / ${element.media.hauteur}`,
                    }}
                  >
                    <SafeImage
                      src={element.media.urlMiniature || element.media.url}
                      alt={element.texteAlt || element.legende || "Portfolio photo"}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                    <div className="min-w-0 flex-1 text-left">
                      {(element.legende || element.titre) && (
                        <p className="truncate text-xs font-medium text-white">
                          {element.legende || element.titre}
                        </p>
                      )}
                      {element.categorie && (
                        <p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-white/70 uppercase">
                          {categoriePortfolioLabels[element.categorie]}
                        </p>
                      )}
                    </div>
                    <Expand className="size-4 text-white" aria-hidden />
                  </div>
                </button>
                {enableLikes && (
                  <button
                    type="button"
                    onClick={() => void like(element)}
                    disabled={liked.has(element.idElement)}
                    aria-label="Aimer la photo"
                    className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-2 text-xs text-white backdrop-blur transition hover:bg-black/80 disabled:text-pink-300"
                  >
                    <Heart
                      className={cn("size-4", liked.has(element.idElement) && "fill-current")}
                      aria-hidden
                    />
                    {element.nombreLikes + Number(liked.has(element.idElement))}
                  </button>
                )}
              </figure>
            </li>
          );
        })}
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
                  {(open ?? 0) + 1} / {visibleElements.length}
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
