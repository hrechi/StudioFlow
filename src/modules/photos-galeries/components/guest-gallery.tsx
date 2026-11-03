"use client";

import { ChevronLeft, ChevronRight, Eye, ImageOff } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Photo } from "../galerie.types";

/** Guests only ever get the preview (never the original file). */
export function guestPhotoUrl(token: string, photoId: string) {
  return `/api/g/${token}/photos/${photoId}`;
}

// Read only: no "Save image as…" menu and no dragging the photo out.
const noSave = {
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onDragStart: (e: React.DragEvent) => e.preventDefault(),
};

/** /g/[token] — read-only view of a shared gallery for guests: no download, favorites or comments. */
export function GuestGallery({
  token,
  photos,
}: {
  token: string;
  photos: Pick<Photo, "id" | "nomFichier">[];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : photos[index];
  const go = (delta: number) =>
    setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length));

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No photos yet"
        description="The studio hasn't added photos to this gallery yet."
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`Open photo ${i + 1}`}
            >
              <SafeImage
                src={guestPhotoUrl(token, photo.id)}
                alt={`Photo ${i + 1}`}
                fill
                draggable={false}
                {...noSave}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-3 bg-charcoal p-3 text-white sm:max-w-5xl">
          <DialogTitle className="sr-only">
            Photo {index === null ? "" : index + 1} of {photos.length}
          </DialogTitle>
          <DialogDescription className="sr-only">Photo viewer (view only)</DialogDescription>
          {current && (
            <>
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg">
                <SafeImage
                  key={current.id}
                  src={guestPhotoUrl(token, current.id)}
                  alt={`Photo ${(index ?? 0) + 1}`}
                  fill
                  draggable={false}
                  {...noSave}
                  sizes="(min-width: 1024px) 64rem, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    onClick={() => go(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    onClick={() => go(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                <span className="text-xs text-white/70">
                  {(index ?? 0) + 1} / {photos.length}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <Eye className="size-3.5" aria-hidden />
                  View only
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
