"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { categoriePortfolioLabels } from "../../../portfolio.types";
import { Lightbox } from "../Lightbox";
import type { GalleryPhoto } from "../galleryTypes";

const PAGE_SIZE = 24;

export function EventGallery({
  id,
  title,
  photos,
}: {
  id?: string;
  title: string;
  photos: GalleryPhoto[];
}) {
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const categories = useMemo(
    () => Array.from(new Set(photos.map((photo) => photo.category).filter(Boolean))),
    [photos],
  );
  const filtered = category === "all" ? photos : photos.filter((photo) => photo.category === category);
  const featured = filtered.filter((photo) => photo.highlighted).slice(0, 5);
  const regular = filtered.filter((photo) => !featured.some((item) => item.id === photo.id));
  const shown = regular.slice(0, visibleCount);

  return (
    <section
      id={id}
      aria-label={title}
      className="scroll-mt-24 bg-[#101014] px-4 py-12 text-white sm:px-6 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-fuchsia-300 uppercase">
              Event · selected moments
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-5xl">{title}</h2>
          </div>
          {categories.length > 1 && (
            <label className="grid gap-1 text-xs text-white/65">
              Filter gallery
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="rounded-full border border-white/20 bg-[#1a1a20] px-4 py-2 text-sm text-white"
              >
                <option value="all">All moments</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {categoriePortfolioLabels[item as keyof typeof categoriePortfolioLabels] ?? item}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {featured.length > 0 && (
          <div className="mb-10">
            <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-fuchsia-200 uppercase">
              Highlights
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {featured.map((photo, index) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(photos.findIndex((item) => item.id === photo.id))}
                    aria-label={`View highlighted photo: ${photo.alt}`}
                    className="group relative block aspect-[4/3] w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-fuchsia-300"
                  >
                    <SafeImage
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      unoptimized
                      loading={index < 2 ? "eager" : "lazy"}
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {(photo.caption || photo.title) && (
                      <span className="absolute bottom-2 left-3 font-serif text-sm">
                        {photo.caption || photo.title}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
          {shown.map((photo, index) => (
            <motion.li
              key={photo.id}
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.35, delay: Math.min(index % 4, 3) * 0.04 }}
              className="mb-3 break-inside-avoid"
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(photos.findIndex((item) => item.id === photo.id))}
                aria-label={`Enlarge: ${photo.alt}`}
                className="group relative block w-full overflow-hidden bg-white/5 text-left focus-visible:outline-2 focus-visible:outline-fuchsia-300"
              >
                <div
                  className="relative w-full"
                  style={{
                    aspectRatio:
                      photo.width && photo.height
                        ? `${photo.width} / ${photo.height}`
                        : index % 3 === 0
                          ? "4 / 5"
                          : "4 / 3",
                  }}
                >
                  <SafeImage
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(min-width: 1280px) 24vw, (min-width: 640px) 48vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                {(photo.caption || photo.title) && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 font-serif text-sm">
                    {photo.caption || photo.title}
                  </span>
                )}
              </button>
            </motion.li>
          ))}
        </ul>
        {shown.length < regular.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="mx-auto mt-8 block rounded-full border border-white/30 px-5 py-2.5 text-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-fuchsia-300"
          >
            Show {Math.min(PAGE_SIZE, regular.length - shown.length)} more photos
          </button>
        )}
      </div>

      <Lightbox
        photos={photos}
        selectedIndex={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onSelect={setSelectedIndex}
        reducedMotion={Boolean(reducedMotion)}
      />
    </section>
  );
}
