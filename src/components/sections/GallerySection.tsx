"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Grid, Eye, ArrowDown, ChevronRight, Sparkles } from "lucide-react";
import { GALLERY_CHAPTERS, type GalleryChapter, type GalleryPhoto } from "@/data/gallery";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Lightbox } from "@/components/gallery/Lightbox";

// Dynamically load the 3D Canvas scene with SSR disabled for optimal performance
const CorridorScene = dynamic(
  () => import("@/components/gallery/CorridorScene").then((m) => m.CorridorScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-[#0c0705]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-[#e8a34a] border-t-transparent" />
          <span className="font-mono text-xs tracking-widest text-[#e8a34a]/80 uppercase">
            Préparation de la galerie...
          </span>
        </div>
      </div>
    ),
  },
);

type GallerySectionProps = {
  chapters?: GalleryChapter[];
  isDark?: boolean;
  className?: string;
};

export function GallerySection({
  chapters = GALLERY_CHAPTERS,
  isDark = true,
  className = "",
}: GallerySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);

  // States
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isScrolledEnough, setIsScrolledEnough] = useState(false);
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const activeChapter = chapters[activeChapterIndex] || chapters[0];
  const allPhotos = chapters.flatMap((c) => c.photos);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      setViewMode("grid");
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setReducedMotion(true);
        setViewMode("grid");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Native high-performance scroll listener calculating 0 -> 1 progress
  // Pattern: height = 100vh * chapters (400vh), sticky top-0 h-screen
  useEffect(() => {
    if (viewMode !== "3d") return;

    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const totalScrollable = el.offsetHeight - windowH;

      if (totalScrollable <= 0) return;

      // Progress begins when top of section hits top of viewport (start start)
      // Progress finishes when bottom of section hits bottom of viewport (end end)
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

      scrollProgressRef.current = progress;

      // Hide "SCROLL TO WALK" after ~5% progress
      if (progress > 0.05 && !isScrolledEnough) {
        setIsScrolledEnough(true);
      } else if (progress <= 0.05 && isScrolledEnough) {
        setIsScrolledEnough(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [viewMode, isScrolledEnough]);

  const handleChapterChange = useCallback((index: number) => {
    setActiveChapterIndex(index);
  }, []);

  const handleOpenPhoto = useCallback((photo: GalleryPhoto) => {
    setSelectedPhoto(photo);
  }, []);

  // Section runway height: 100vh * number of chapters (ex. 400vh for 4 chapters)
  const runwayHeight = `${chapters.length * 100}vh`;

  return (
    <section
      id="galerie"
      ref={sectionRef}
      aria-label="Galerie photographique immersive"
      className={`relative w-full ${className}`}
      style={{
        // scroll-margin-top ensures smooth navigation from fixed topbar
        scrollMarginTop: "54px",
        height: viewMode === "3d" ? runwayHeight : "auto",
        backgroundColor: isDark ? "#0c0705" : "#faf6ee",
      }}
    >
      {viewMode === "3d" ? (
        /* STICKY 3D CORRIDOR CONTAINER */
        <div className="sticky top-0 h-screen w-full overflow-hidden select-none">
          {/* 3D Canvas Scene */}
          <CorridorScene
            scrollProgressRef={scrollProgressRef}
            isDark={isDark}
            chapters={chapters}
            onSelectPhoto={handleOpenPhoto}
            onChapterChange={handleChapterChange}
          />

          {/* HTML OVERLAY: Top Header & View Toggle Button */}
          <div className="pointer-events-none absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <span
                className="size-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(232,163,74,0.7)]"
                style={{ backgroundColor: "var(--portfolio-accent, #e8a34a)" }}
              />
              <span className="font-mono text-[10px] tracking-[0.25em] text-[#e8a34a] uppercase">
                GALERIE 3D · MUSÉE VIRTUEL
              </span>
            </div>

            {/* Toggle Mode Button: Switch between 3D Corridor and Grid */}
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Basculer vers l'affichage en grille"
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md transition-all duration-300 hover:border-[#e8a34a]/60 hover:bg-black/75 hover:scale-105"
            >
              <Grid className="size-3.5 text-[#e8a34a]" />
              <span className="font-mono text-[10px] tracking-wider text-white/90 uppercase">
                Voir en grille
              </span>
            </button>
          </div>

          {/* HTML OVERLAY: Dynamic Chapter Title & Legend (Center Left / Bottom) */}
          <div className="pointer-events-none absolute bottom-12 left-6 sm:bottom-16 sm:left-12 z-20 max-w-xl transition-all duration-500">
            <div className="rounded-xl border border-white/10 bg-black/65 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-[0.25em] text-[#e8a34a] uppercase">
                  {activeChapter.label}
                </span>
                <span className="text-white/30">·</span>
                <span className="font-mono text-[10px] text-white/50">
                  {activeChapter.photos.length} TIRAGES
                </span>
              </div>

              <h2 className="mt-1 font-serif text-2xl sm:text-4xl font-medium tracking-tight text-white drop-shadow-md">
                {activeChapter.title}
              </h2>

              {activeChapter.subtitle && (
                <p className="mt-2 font-sans text-xs sm:text-sm text-white/70 line-clamp-2">
                  {activeChapter.subtitle}
                </p>
              )}

              {/* Chapter Navigation Pills */}
              <div className="pointer-events-auto mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      // Smooth scroll jump to that chapter's runway segment
                      const el = sectionRef.current;
                      if (!el) return;
                      const segment = (el.offsetHeight - window.innerHeight) / chapters.length;
                      const targetTop = el.offsetTop + idx * segment;
                      window.scrollTo({ top: targetTop, behavior: "smooth" });
                    }}
                    className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase transition-colors ${
                      idx === activeChapterIndex
                        ? "bg-[#e8a34a] text-black font-semibold"
                        : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {ch.number}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HTML OVERLAY: "SCROLL TO WALK" Indicator */}
          <div
            className={`pointer-events-none absolute bottom-8 inset-x-0 z-20 flex flex-col items-center justify-center transition-opacity duration-500 ${
              isScrolledEnough ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 backdrop-blur-md">
              <ArrowDown className="size-3.5 animate-bounce text-[#e8a34a]" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#f4e4de] uppercase">
                SCROLL TO WALK
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* FALLBACK CLASSIC GRID */
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
            <div>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#e8a34a] uppercase">
                EXPOSITION EN GRILLE
              </span>
              <h2 className="mt-1 font-serif text-3xl font-medium text-white">
                Les Collections Photographiques
              </h2>
            </div>

            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className="flex items-center gap-2 rounded-full border border-[#e8a34a]/40 bg-[#e8a34a]/10 px-4 py-2 text-[#e8a34a] transition-all hover:bg-[#e8a34a]/20"
              >
                <Eye className="size-4" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                  Visiter en 3D
                </span>
              </button>
            )}
          </div>

          <GalleryGrid chapters={chapters} onOpenLightbox={handleOpenPhoto} />
        </div>
      )}

      {/* Global Interactive Lightbox Modal */}
      <Lightbox
        photo={selectedPhoto}
        photos={allPhotos}
        onClose={() => setSelectedPhoto(null)}
        onSelectPhoto={setSelectedPhoto}
      />
    </section>
  );
}

