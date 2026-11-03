"use client";

import React, { useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Lightbox } from "./Lightbox";
import type { GalleryChapter, GalleryPhoto } from "@/data/gallery";

type GalleryGridProps = {
  chapters: GalleryChapter[];
  onOpenLightbox?: (photo: GalleryPhoto) => void;
};

export function GalleryGrid({ chapters, onOpenLightbox }: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  const allPhotos = chapters.flatMap((c) => c.photos);

  const handlePhotoClick = (photo: GalleryPhoto) => {
    if (onOpenLightbox) {
      onOpenLightbox(photo);
    } else {
      setSelectedPhoto(photo);
    }
  };

  return (
    <div className="space-y-24 py-12">
      {chapters.map((chapter) => (
        <section key={chapter.id} className="space-y-8">
          {/* Chapter Header */}
          <div className="border-b border-white/10 pb-4">
            <span className="font-mono text-[10px] font-semibold tracking-[0.25em] text-[#e8a34a] uppercase">
              {chapter.label}
            </span>
            <h3 className="mt-1 font-serif text-2xl sm:text-3xl font-medium tracking-tight text-white">
              {chapter.title}
            </h3>
            {chapter.subtitle && (
              <p className="mt-2 text-sm text-white/60 max-w-2xl font-sans">
                {chapter.subtitle}
              </p>
            )}
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapter.photos.map((photo) => (
              <div
                key={photo.id}
                role="button"
                tabIndex={0}
                onClick={() => handlePhotoClick(photo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePhotoClick(photo);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-md border border-white/10 bg-[#120b08] p-3 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#e8a34a]/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(232,163,74,0.15)] focus:outline-hidden focus:ring-2 focus:ring-[#e8a34a]"
              >
                {/* Museum Frame Passe-Partout Mat */}
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[2px] bg-black p-1 shadow-inner">
                  <SafeImage
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Frame Caption */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <div>
                    <h4 className="font-serif text-sm font-medium text-white group-hover:text-[#e8a34a] transition-colors">
                      {photo.title}
                    </h4>
                    <p className="font-mono text-[9px] text-white/50 tracking-wider uppercase">
                      {photo.category}
                    </p>
                  </div>
                  {photo.year && (
                    <span className="font-mono text-[9px] text-[#e8a34a]/70">
                      {photo.year}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Internal Lightbox if not delegated */}
      {!onOpenLightbox && (
        <Lightbox
          photo={selectedPhoto}
          photos={allPhotos}
          onClose={() => setSelectedPhoto(null)}
          onSelectPhoto={setSelectedPhoto}
        />
      )}
    </div>
  );
}

