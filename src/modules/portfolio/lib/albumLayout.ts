export type AlbumPhoto = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  title?: string;
  likes?: number;
};

export type AlbumPageLayout = {
  kind: "note" | "single" | "stack" | "feature" | "grid";
  photos: AlbumPhoto[];
  caption?: string;
};

export const MAX_ALBUM_PHOTOS = 12;

const PAGE_PATTERNS: ReadonlyArray<{
  kind: Exclude<AlbumPageLayout["kind"], "note">;
  photoCount: number;
}> = [
  { kind: "stack", photoCount: 2 },
  { kind: "single", photoCount: 1 },
  { kind: "feature", photoCount: 3 },
  { kind: "grid", photoCount: 3 },
];

export function createAlbumLayout(photos: AlbumPhoto[]): AlbumPageLayout[] {
  const visiblePhotos = photos.slice(0, MAX_ALBUM_PHOTOS);
  const pages: AlbumPageLayout[] = [];
  let photoIndex = 0;
  let patternIndex = 0;

  while (photoIndex < visiblePhotos.length) {
    const pattern = PAGE_PATTERNS[patternIndex % PAGE_PATTERNS.length];
    const count = Math.min(pattern.photoCount, visiblePhotos.length - photoIndex);
    pages.push({
      kind: pattern.kind,
      photos: visiblePhotos.slice(photoIndex, photoIndex + count),
    });
    photoIndex += count;
    patternIndex += 1;

    if (photoIndex < visiblePhotos.length && patternIndex % 3 === 2) {
      const recentCaption = visiblePhotos[photoIndex - 1]?.caption;
      pages.push({
        kind: "note",
        photos: [],
        caption:
          recentCaption || "Each photograph keeps a light, a place, and a moment to remember.",
      });
    }
  }

  return pages;
}
