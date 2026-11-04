"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Maximize, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { GalleryPhotoGrid } from "./GalleryPhotoGrid";
import type { GalleryPhoto } from "../galleryTypes";

export function PortraitGallery({
  id,
  title,
  photos,
}: {
  id?: string;
  title: string;
  photos: GalleryPhoto[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const galleryRef = useRef<HTMLElement>(null);
  const dragStart = useRef<number | null>(null);

  const goTo = useCallback(
    (index: number) => setActiveIndex((index + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const timer = window.setTimeout(() => goTo(activeIndex + 1), 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, goTo, photos.length, playing]);

  useEffect(() => {
    const nextPhoto = photos[(activeIndex + 1) % photos.length];
    if (!nextPhoto) return;
    const image = new window.Image();
    image.src = nextPhoto.src;
  }, [activeIndex, photos]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goTo]);

  if (prefersReducedMotion) return <GalleryPhotoGrid id={id} title={title} photos={photos} />;
  const activePhoto = photos[activeIndex];
  if (!activePhoto) return null;

  async function enterFullscreen() {
    if (!galleryRef.current) return;
    setFullscreenError("");
    try {
      if (!document.fullscreenElement) {
        await galleryRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setFullscreenError("Fullscreen mode is not available in this browser.");
    }
  }

  return (
    <section
      id={id}
      ref={galleryRef}
      aria-label={`${title} — galerie portrait`}
      className="relative isolate min-h-[72vh] overflow-hidden bg-black text-white sm:min-h-[82vh]"
      onPointerDown={(event) => {
        dragStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (dragStart.current === null) return;
        const delta = event.clientX - dragStart.current;
        if (Math.abs(delta) > 48) goTo(activeIndex + (delta < 0 ? 1 : -1));
        dragStart.current = null;
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhoto.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1 }}
            animate={{ scale: 1.08 }}
            transition={{ duration: 5, ease: "linear" }}
          >
            <SafeImage
              src={activePhoto.src}
              alt={activePhoto.alt}
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-8">
        <h2 className="font-serif text-lg tracking-wide sm:text-2xl">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause slideshow" : "Start slideshow"}
            className="grid size-10 place-items-center rounded-full border border-white/40 bg-black/25 backdrop-blur transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            onClick={() => void enterFullscreen()}
            aria-label="Toggle fullscreen"
            className="grid size-10 place-items-center rounded-full border border-white/40 bg-black/25 backdrop-blur transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <Maximize size={17} />
          </button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-end justify-between gap-4 p-4 pb-6 sm:p-8">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous portrait"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/40 bg-black/25 backdrop-blur hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          {(activePhoto.caption || activePhoto.title) && (
            <p className="truncate font-serif text-base sm:text-lg">
              {activePhoto.caption || activePhoto.title}
            </p>
          )}
          <p className="mt-1 text-xs text-white/65">
            {activeIndex + 1} / {photos.length}
          </p>
          <div className="mx-auto mt-4 hidden max-w-xl gap-2 overflow-x-auto pb-1 sm:flex">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Afficher ${photo.alt}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-sm border transition ${
                  index === activeIndex ? "border-white opacity-100" : "border-transparent opacity-55"
                }`}
              >
                <SafeImage
                  src={photo.src}
                  alt=""
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Portrait suivant"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/40 bg-black/25 backdrop-blur hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
        >
          <ArrowRight size={18} />
        </button>
      </div>
      {fullscreenError && (
        <p role="status" className="absolute right-4 bottom-24 rounded bg-black/70 px-3 py-2 text-xs">
          {fullscreenError}
        </p>
      )}
    </section>
  );
}
