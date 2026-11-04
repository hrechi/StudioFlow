"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Lightbox } from "../Lightbox";
import type { FashionShoot, GalleryPhoto } from "../galleryTypes";

export function FashionGallery({
  id,
  shoots,
}: {
  id?: string;
  shoots: FashionShoot[];
}) {
  const reducedMotion = useReducedMotion();
  const photos = shoots.flatMap((shoot) => shoot.photos);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const shootOffsets = shoots.map((shoot, index) =>
    shoots.slice(0, index).reduce((total, previous) => total + previous.photos.length, 0),
  );

  return (
    <section
      id={id}
      aria-label="Editorial gallery"
      className="scroll-mt-24 overflow-hidden bg-[var(--portfolio-bg)] text-[var(--portfolio-text)]"
    >
      {shoots.map((shoot, shootIndex) => {
        const offset = shootOffsets[shootIndex];
        return (
          <article key={shoot.id} className="mx-auto max-w-[1500px] px-4 py-16 sm:px-8 lg:py-28">
            <header className="mb-8 grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto]">
              <div>
                {shoot.season && (
                  <p className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">
                    {shoot.season}
                  </p>
                )}
                <h2 className="font-serif text-[clamp(3rem,12vw,10rem)] leading-[0.82] tracking-[-0.06em]">
                  {shoot.title}
                </h2>
              </div>
              <p className="max-w-56 pb-2 text-xs leading-relaxed opacity-65">
                A visual story shaped by light and movement.
              </p>
            </header>
            <ul className="grid grid-cols-1 items-start gap-x-6 gap-y-10 sm:grid-cols-2 lg:gap-x-10">
              {shoot.photos.map((photo, index) => {
                const globalIndex = offset + index;
                const layout = index % 5;
                return (
                  <li
                    key={photo.id}
                    className={
                      layout === 0
                        ? "sm:col-span-2"
                        : layout === 1
                          ? "sm:mt-16"
                          : layout === 3
                            ? "sm:col-start-2 sm:mt-20"
                            : ""
                    }
                  >
                    <EditorialPhoto
                      photo={photo}
                      index={index}
                      reducedMotion={Boolean(reducedMotion)}
                      onOpen={() => setSelectedIndex(globalIndex)}
                      featured={layout === 0}
                    />
                  </li>
                );
              })}
            </ul>
            {shootIndex < shoots.length - 1 && (
              <div className="my-16 border-t border-[var(--portfolio-border)] lg:my-24" />
            )}
          </article>
        );
      })}
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

function EditorialPhoto({
  photo,
  index,
  reducedMotion,
  onOpen,
  featured,
}: {
  photo: GalleryPhoto;
  index: number;
  reducedMotion: boolean;
  onOpen: () => void;
  featured: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : -20, reducedMotion ? 0 : 20]);

  return (
    <motion.div ref={ref} style={{ y }} className="group">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View photo: ${photo.alt}`}
        className={`relative block w-full overflow-hidden bg-black/5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--portfolio-accent)] ${
          featured ? "aspect-[16/9]" : index % 2 === 0 ? "aspect-[4/5]" : "aspect-[3/4]"
        }`}
      >
        <SafeImage
          src={photo.src}
          alt={photo.alt}
          fill
          unoptimized
          loading={index < 2 ? "eager" : "lazy"}
          sizes={featured ? "100vw" : "(min-width: 1024px) 48vw, 100vw"}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
        />
        {featured && (
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        )}
        <span className="absolute right-4 bottom-4 rounded-full bg-black/55 px-3 py-1 text-[10px] tracking-[0.12em] text-white uppercase opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View
        </span>
      </button>
      {(photo.caption || photo.title) && (
        <p className="mt-3 font-serif text-sm opacity-75">{photo.caption || photo.title}</p>
      )}
    </motion.div>
  );
}
