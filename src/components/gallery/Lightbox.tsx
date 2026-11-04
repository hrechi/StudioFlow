"use client";

import React, { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import type { GalleryPhoto } from "@/data/gallery";

type LightboxProps = {
  photo: GalleryPhoto | null;
  photos: GalleryPhoto[];
  onClose: () => void;
  onSelectPhoto: (photo: GalleryPhoto) => void;
};

export function Lightbox({ photo, photos, onClose, onSelectPhoto }: LightboxProps) {
  const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onSelectPhoto(photos[currentIndex - 1]);
    } else {
      onSelectPhoto(photos[photos.length - 1]);
    }
  }, [currentIndex, photos, onSelectPhoto]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onSelectPhoto(photos[currentIndex + 1]);
    } else {
      onSelectPhoto(photos[0]);
    }
  }, [currentIndex, photos, onSelectPhoto]);

  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [photo, onClose, handlePrev, handleNext]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vue plein écran: ${photo.title}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Top Header Controls */}
      <div
        className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold tracking-widest text-[#e8a34a] uppercase">
            {photo.category}
          </span>
          <span className="text-white/30">/</span>
          <span className="font-mono text-xs text-white/60">
            {String(currentIndex + 1).padStart(2, "0")} sur {String(photos.length).padStart(2, "0")}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la vue plein écran (Échap)"
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-h-[80vh] max-w-5xl w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-lg bg-black/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SafeImage
          src={photo.src}
          alt={photo.alt}
          fill
          unoptimized
          sizes="(min-width: 1200px) 1200px, 100vw"
          className="object-contain"
        />
      </div>

      {/* Bottom Photo Metadata */}
      <div
        className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg sm:text-2xl font-medium text-white tracking-tight">
          {photo.title}
        </h3>
        {photo.year && (
          <p className="mt-1 font-mono text-[10px] text-[#e8a34a]/80 tracking-widest">
            TIRAGE D&apos;ART · {photo.year}
          </p>
        )}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        aria-label="Image précédente (Flèche gauche)"
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70 transition-all hover:bg-white/10 hover:text-white hover:scale-105"
      >
        <ChevronLeft className="size-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        aria-label="Image suivante (Flèche droite)"
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70 transition-all hover:bg-white/10 hover:text-white hover:scale-105"
      >
        <ChevronRight className="size-6" />
      </button>
    </div>
  );
}

