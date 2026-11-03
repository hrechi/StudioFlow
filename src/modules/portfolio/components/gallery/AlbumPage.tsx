"use client";

import { forwardRef } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import type { AlbumPageLayout, AlbumPhoto } from "../../lib/albumLayout";

const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjE2IDAgMTYgMTAiPjxyZWN0IHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgZmlsbD0iI2U4ZGZkMCIvPjwvc3ZnPg==";

function PhotoTile({
  photo,
  onSelect,
  priority,
  className = "",
}: {
  photo: AlbumPhoto;
  onSelect: () => void;
  priority: boolean;
  className?: string;
}) {
  return (
    <figure className={`flex min-h-0 min-w-0 flex-col ${className}`}>
      <button
        type="button"
        aria-label={`Expand: ${photo.alt}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className="group relative min-h-0 flex-1 cursor-zoom-in overflow-hidden border border-[#d4c8b3] bg-[#eee8df] p-1.5 shadow-[0_2px_8px_rgba(54,39,22,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b48752]"
      >
        <span className="relative block size-full overflow-hidden">
          <SafeImage
            src={photo.src}
            alt={photo.alt}
            fill
            unoptimized
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            loading={priority ? "eager" : "lazy"}
            sizes="(min-width: 900px) 36vw, 88vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        </span>
      </button>
      {(photo.caption || photo.title) && (
        <figcaption className="mt-1.5 line-clamp-2 text-center font-serif text-[10px] leading-relaxed text-[#756a59] sm:text-[11px]">
          {photo.caption || photo.title}
        </figcaption>
      )}
    </figure>
  );
}

export const AlbumPage = forwardRef<
  HTMLDivElement,
  {
    page: AlbumPageLayout;
    pageNumber: number;
    onSelectPhoto: (photoId: string) => void;
    priority?: boolean;
  }
>(function AlbumPage({ page, pageNumber, onSelectPhoto, priority = false }, ref) {
  const renderPhoto = (photo: AlbumPhoto, className = "") => (
    <PhotoTile
      key={photo.id}
      photo={photo}
      onSelect={() => onSelectPhoto(photo.id)}
      priority={priority}
      className={className}
    />
  );

  return (
    <div
      ref={ref}
      data-density="soft"
      data-album-page
      aria-label={`Page ${pageNumber} of the album`}
      className="album-book-page relative h-full w-full overflow-hidden bg-[#fffdf8] p-3 text-[#332b21] shadow-[inset_0_0_22px_rgba(80,60,35,0.07)] sm:p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#9e8b6e]/15 to-transparent"
      />
      <div className="relative flex size-full flex-col">
        {page.kind === "stack" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            {page.photos.map((photo) => renderPhoto(photo, "flex-1"))}
          </div>
        ) : page.kind === "feature" ? (
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
            {page.photos[0] && renderPhoto(page.photos[0])}
            <div className="grid min-h-0 grid-cols-2 gap-2.5">
              {page.photos.slice(1).map((photo) => renderPhoto(photo))}
            </div>
          </div>
        ) : page.kind === "grid" ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5">
            {page.photos.map((photo) => renderPhoto(photo))}
          </div>
        ) : (
          page.photos[0] && renderPhoto(page.photos[0], "flex-1")
        )}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 bottom-1.5 font-mono text-[7px] tracking-[0.18em] text-[#a28a69]/65"
      >
        REFRAME · {String(pageNumber).padStart(2, "0")}
      </span>
    </div>
  );
});
