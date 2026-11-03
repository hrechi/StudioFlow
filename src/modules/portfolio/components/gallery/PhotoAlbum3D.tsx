"use client";

import HTMLFlipBook from "react-pageflip";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { AlbumCover } from "./AlbumCover";
import { AlbumPage } from "./AlbumPage";
import { Lightbox } from "./Lightbox";
import { TextCardPage } from "./TextCardPage";
import { createAlbumLayout, MAX_ALBUM_PHOTOS, type AlbumPhoto } from "../../lib/albumLayout";

type PageFlipApi = {
  flipNext: () => void;
  flipPrev: () => void;
};

type FlipBookHandle = {
  pageFlip: () => PageFlipApi | null;
};

function getFlipIndex(event: unknown): number | null {
  if (!event || typeof event !== "object" || !("data" in event)) return null;
  return typeof event.data === "number" ? event.data : null;
}

function AlbumGrid({
  photos,
  onSelect,
}: {
  photos: AlbumPhoto[];
  onSelect: (index: number) => void;
}) {
  return (
    <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
      {photos.map((photo, index) => (
        <li key={photo.id}>
          <button
            type="button"
            className="group w-full overflow-hidden rounded-xl border text-left shadow-sm transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--portfolio-accent)]"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "var(--portfolio-surface)",
            }}
            onClick={() => onSelect(index)}
          >
            <span className="relative block aspect-[4/3] bg-[#eee8df]">
              <SafeImage
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                loading="lazy"
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                className="absolute inset-0 size-full object-cover"
              />
            </span>
            <span className="block p-3">
              <span className="block truncate font-serif text-sm">
                {photo.title || photo.caption}
              </span>
              {photo.caption && (
                <span
                  className="mt-1 line-clamp-2 block text-xs"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {photo.caption}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PhotoAlbum3D({
  photos,
  title,
  photographer,
  coverColor = "#443326",
  surfaceColor = "var(--portfolio-bg, #e9e4dc)",
  portfolioId,
  slug,
  enableLikes = false,
}: {
  photos: AlbumPhoto[];
  title: string;
  photographer: string;
  coverColor?: string;
  surfaceColor?: string;
  portfolioId?: string;
  slug?: string;
  enableLikes?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const bookRef = useRef<FlipBookHandle | null>(null);
  const displayedPhotos = useMemo(() => photos.slice(0, MAX_ALBUM_PHOTOS), [photos]);
  const pages = useMemo(() => createAlbumLayout(displayedPhotos), [displayedPhotos]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [likeError, setLikeError] = useState("");
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const selectAlbumPhoto = useCallback(
    (photoId: string) => {
      const index = displayedPhotos.findIndex((photo) => photo.id === photoId);
      if (index >= 0) setSelectedIndex(index);
    },
    [displayedPhotos],
  );

  const handleFlip = useCallback((event: unknown) => {
    const pageIndex = getFlipIndex(event);
    if (pageIndex !== null) setCurrentPage(pageIndex);
  }, []);

  const handleLike = useCallback(async () => {
    const photo = selectedIndex === null ? null : displayedPhotos[selectedIndex];
    if (!photo || !portfolioId || !slug) return;
    setLikeError("");
    try {
      const response = await fetch(`/api/portfolio/${encodeURIComponent(slug)}/like`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portfolioId, elementId: photo.id }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setLikeError(result.message ?? "Unable to like this photo right now.");
        return;
      }
      setLiked((previous) => new Set(previous).add(photo.id));
    } catch (error) {
      console.error("Unable to submit the photo like.", error);
      setLikeError("Unable to submit your appreciation. Please try again.");
    }
  }, [displayedPhotos, portfolioId, selectedIndex, slug]);

  const turnPage = (direction: "next" | "previous") => {
    const pageFlip = bookRef.current?.pageFlip();
    if (direction === "next") pageFlip?.flipNext();
    else pageFlip?.flipPrev();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    turnPage(event.key === "ArrowRight" ? "next" : "previous");
  };

  if (displayedPhotos.length === 0) return null;

  if (prefersReducedMotion) {
    return (
      <div>
        <AlbumGrid photos={displayedPhotos} onSelect={setSelectedIndex} />
        <Lightbox
          photos={displayedPhotos}
          selectedIndex={selectedIndex}
          onClose={closeLightbox}
          onSelect={setSelectedIndex}
          reducedMotion
          liked={selectedIndex !== null && liked.has(displayedPhotos[selectedIndex]?.id ?? "")}
          onLike={enableLikes ? () => void handleLike() : undefined}
          likeError={likeError}
        />
      </div>
    );
  }

  const pageCount = pages.length + 2;
  const progress = pageCount > 1 ? (currentPage / (pageCount - 1)) * 100 : 0;
  const atFrontCover = currentPage === 0;
  const atBackCover = currentPage === pageCount - 1;

  return (
    <div
      className="portfolio-album-stage relative isolate overflow-hidden px-3 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: surfaceColor, "--album-cover-color": coverColor } as CSSProperties}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              className="font-mono text-[9px] tracking-[0.22em] uppercase"
              style={{ color: "var(--portfolio-muted)" }}
            >
              Photography album
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--portfolio-muted)" }}>
              {photographer} · {displayedPhotos.length} photographs
              {photos.length > MAX_ALBUM_PHOTOS &&
                ` · ${MAX_ALBUM_PHOTOS} displayed from ${photos.length}`}
            </p>
          </div>
          <p
            className="min-w-24 text-right font-mono text-[10px]"
            aria-live="polite"
            aria-atomic="true"
            style={{ color: "var(--portfolio-muted)" }}
          >
            {atFrontCover
              ? "Cover"
              : atBackCover
                ? "End of album"
                : `Page ${currentPage + 1}`}
            <span className="ml-1 opacity-70">/ {pageCount}</span>
          </p>
        </header>

        <div
          tabIndex={0}
          aria-label={`${title}, photo album. Use the left and right arrow keys to turn pages.`}
          onKeyDown={handleKeyDown}
          className="mx-auto w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--portfolio-accent)]"
        >
          <HTMLFlipBook
            ref={bookRef}
            className="portfolio-pageflip mx-auto"
            style={{ width: "100%", maxWidth: 940 }}
            width={460}
            height={620}
            size="stretch"
            minWidth={280}
            maxWidth={470}
            minHeight={380}
            maxHeight={650}
            usePortrait
            showCover
            flippingTime={900}
            maxShadowOpacity={0.42}
            drawShadow
            autoSize
            mobileScrollSupport={false}
            swipeDistance={30}
            showPageCorners
            clickEventForward
            useMouseEvents
            disableFlipByClick={false}
            startPage={0}
            startZIndex={0}
            renderOnlyPageLengthChange={false}
            onFlip={handleFlip}
          >
            <AlbumCover
              key="album-cover-front"
              title={title}
              photographer={photographer}
              pageNumber={1}
            />
            {pages.map((page, index) =>
              page.kind === "note" ? (
                <TextCardPage
                  key={`note-${index}`}
                  caption={page.caption ?? "A precious memory."}
                  pageNumber={index + 2}
                />
              ) : (
                <AlbumPage
                  key={`page-${index}`}
                  page={page}
                  pageNumber={index + 2}
                  onSelectPhoto={selectAlbumPhoto}
                  priority={index < 3}
                />
              ),
            )}
            <AlbumCover
              key="album-cover-back"
              title={title}
              photographer={photographer}
              back
              pageNumber={pageCount}
            />
          </HTMLFlipBook>
        </div>

        <div
          className="mx-auto mt-3 h-1 w-full max-w-[920px] overflow-hidden rounded-full bg-black/10"
          role="progressbar"
          aria-label="Album progress"
          aria-valuemin={0}
          aria-valuemax={pageCount - 1}
          aria-valuenow={currentPage}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%`, backgroundColor: "var(--portfolio-accent)" }}
          />
        </div>

        <nav
          aria-label="Album navigation"
          className="mt-4 flex items-center justify-center gap-3"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={atFrontCover}
            onClick={() => turnPage("previous")}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <p className="min-w-40 text-center text-xs" style={{ color: "var(--portfolio-muted)" }}>
            {atFrontCover ? (
              <span className="inline-flex items-center gap-1">
                <BookOpen aria-hidden className="size-3.5" />
                Open album
              </span>
            ) : (
              `${currentPage + 1} / ${pageCount} · Swipe or use the arrow keys`
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={atFrontCover ? "Open album" : "Next page"}
            disabled={atBackCover}
            onClick={() => turnPage("next")}
          >
            <ArrowRight aria-hidden />
          </Button>
        </nav>
      </div>

      <Lightbox
        photos={displayedPhotos}
        selectedIndex={selectedIndex}
        onClose={closeLightbox}
        onSelect={setSelectedIndex}
        reducedMotion={false}
        liked={selectedIndex !== null && liked.has(displayedPhotos[selectedIndex]?.id ?? "")}
        onLike={enableLikes ? () => void handleLike() : undefined}
        likeError={likeError}
      />
    </div>
  );
}
