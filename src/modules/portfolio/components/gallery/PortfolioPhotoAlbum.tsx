"use client";

import dynamic from "next/dynamic";
import { SafeImage } from "@/components/shared/safe-image";
import type { AlbumPhoto } from "../../lib/albumLayout";

const PhotoAlbum3D = dynamic(() => import("./PhotoAlbum3D").then((module) => module.PhotoAlbum3D), {
  ssr: false,
  loading: () => (
    <div
      className="mx-auto grid aspect-[1.55] w-full max-w-6xl place-items-center rounded-xl border"
      style={{
        borderColor: "var(--portfolio-border)",
        backgroundColor: "var(--portfolio-surface)",
        color: "var(--portfolio-muted)",
      }}
    >
      Loading photo album…
    </div>
  ),
});

export function PortfolioPhotoAlbum({
  id,
  title,
  photographerName,
  photos,
  portfolioId,
  slug,
  enableLikes = true,
  coverColor,
  surfaceColor,
}: {
  id?: string;
  title: string;
  photographerName: string;
  photos: AlbumPhoto[];
  portfolioId: string;
  slug: string;
  enableLikes?: boolean;
  coverColor: string;
  surfaceColor?: string;
}) {
  const visiblePhotos = photos.slice(0, 12);

  return (
    <section
      id={id}
      aria-label={`Photo album ${title}`}
      className="scroll-mt-24"
      style={{ color: "var(--portfolio-text)" }}
    >
      <PhotoAlbum3D
        title={title}
        photographer={photographerName}
        photos={visiblePhotos}
        coverColor={coverColor}
        surfaceColor={surfaceColor}
        portfolioId={portfolioId}
        slug={slug}
        enableLikes={enableLikes}
      />
      <details className="mx-auto mb-8 w-[calc(100%-2rem)] max-w-6xl rounded-xl border">
        <summary
          className="cursor-pointer px-4 py-3 text-sm"
          style={{
            borderColor: "var(--portfolio-border)",
            color: "var(--portfolio-muted)",
          }}
        >
          Browse photos in a grid
        </summary>
        <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {visiblePhotos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
              }}
            >
              <figure>
                <div className="relative aspect-[4/3] bg-[#eee8df]">
                  <SafeImage
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {(photo.caption || photo.title) && (
                  <figcaption className="p-3 font-serif text-sm">
                    {photo.caption || photo.title}
                  </figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
