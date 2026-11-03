"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Heart, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import type { AlbumPhoto } from "../../lib/albumLayout";

export function Lightbox({
  photos,
  selectedIndex,
  onClose,
  onSelect,
  reducedMotion,
  liked,
  onLike,
  likeError,
}: {
  photos: AlbumPhoto[];
  selectedIndex: number | null;
  onClose: () => void;
  onSelect: (index: number) => void;
  reducedMotion: boolean;
  liked?: boolean;
  onLike?: () => void;
  likeError?: string;
}) {
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];
  const dialogRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    if (selectedIndex === null || !selectedPhoto) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onSelect((selectedIndex + 1) % photos.length);
      if (event.key === "ArrowLeft") onSelect((selectedIndex - 1 + photos.length) % photos.length);
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, onSelect, photos.length, selectedIndex, selectedPhoto]);

  return (
    <AnimatePresence>
      {selectedPhoto && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.alt}
          tabIndex={-1}
          ref={dialogRef}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md sm:p-8"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            onClose();
          }}
          onPointerDown={(event) => {
            pointerStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (!pointerStart.current || selectedIndex === null) return;
            const deltaX = event.clientX - pointerStart.current.x;
            const deltaY = event.clientY - pointerStart.current.y;
            if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
              swiped.current = true;
              onSelect((selectedIndex + (deltaX < 0 ? 1 : -1) + photos.length) % photos.length);
            }
            pointerStart.current = null;
          }}
        >
          <motion.div
            className="relative flex h-[min(82dvh,900px)] w-full max-w-6xl flex-col items-center"
            initial={reducedMotion ? false : { scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Close enlarged view"
              className="absolute -top-12 right-0 border-white/30 bg-black/50 text-white hover:bg-white/15 hover:text-white"
              onClick={onClose}
            >
              <X aria-hidden />
            </Button>
            <div className="relative min-h-0 w-full flex-1">
              <SafeImage
                src={selectedPhoto.src}
                alt={selectedPhoto.alt}
                fill
                unoptimized
                sizes="(min-width: 1200px) 1100px, 100vw"
                className="object-contain"
              />
            </div>
            <div className="mt-3 flex w-full items-center justify-between gap-4 text-white">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous photo"
                className="border-white/30 bg-black/50 text-white hover:bg-white/15 hover:text-white"
                onClick={() => onSelect((selectedIndex! - 1 + photos.length) % photos.length)}
              >
                <ArrowLeft aria-hidden />
              </Button>
              <p className="min-w-0 text-center">
                {(selectedPhoto.caption || selectedPhoto.title) && (
                  <span className="block truncate font-serif text-base">
                    {selectedPhoto.caption || selectedPhoto.title}
                  </span>
                )}
                <span className="mt-1 block font-mono text-[10px] text-white/65">
                  {selectedIndex! + 1} / {photos.length}
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next photo"
                className="border-white/30 bg-black/50 text-white hover:bg-white/15 hover:text-white"
                onClick={() => onSelect((selectedIndex! + 1) % photos.length)}
              >
                <ArrowRight aria-hidden />
              </Button>
              {onLike && (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={liked ? "Already liked" : "Like this photo"}
                  disabled={liked}
                  className="border-white/30 bg-black/50 text-white hover:bg-white/15 hover:text-white"
                  onClick={onLike}
                >
                  <Heart aria-hidden className={liked ? "fill-current text-rose-400" : ""} />
                  {(selectedPhoto.likes ?? 0) + (liked ? 1 : 0)}
                </Button>
              )}
            </div>
            {likeError && (
              <p role="status" className="mt-2 text-sm text-red-200">
                {likeError}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
