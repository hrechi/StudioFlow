"use client";

import { useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Lightbox } from "../Lightbox";
import type { GalleryPhoto } from "../galleryTypes";

export function GalleryPhotoGrid({
  id,
  title,
  photos,
}: {
  id?: string;
  title: string;
  photos: GalleryPhoto[];
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const visiblePhotos = photos.slice(0, visibleCount);

  return (
    <section
      id={id}
      aria-label={title}
      className="container mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-20"
      style={{ color: "var(--portfolio-text)" }}
    >
      <h2 className="mb-6 font-serif text-2xl sm:mb-8 sm:text-4xl">{title}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {visiblePhotos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Enlarge: ${photo.alt}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-sm bg-black/5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--portfolio-accent)]"
            >
              <SafeImage
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                loading={index < 3 ? "eager" : "lazy"}
                sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
              />
              {(photo.caption || photo.title) && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-left font-serif text-sm text-white">
                  {photo.caption || photo.title}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {visibleCount < photos.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + 24, photos.length))}
            className="rounded-full border px-5 py-2.5 text-xs font-medium transition hover:border-[var(--portfolio-accent)]"
            style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-text)" }}
          >
            Show more photos ({photos.length - visibleCount} remaining)
          </button>
        </div>
      )}
      <Lightbox
        photos={photos}
        selectedIndex={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onSelect={setSelectedIndex}
        reducedMotion
      />
    </section>
  );
}
