import { describe, expect, it } from "vitest";
import { createAlbumLayout, MAX_ALBUM_PHOTOS, type AlbumPhoto } from "../lib/albumLayout";

const createPhotos = (count: number): AlbumPhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `photo-${index}`,
    src: `/photos/${index}.jpg`,
    alt: `Photographie ${index}`,
    caption: `Légende ${index}`,
  }));

describe("photo album layout", () => {
  it("places photos in their original order exactly once", () => {
    const photos = createPhotos(MAX_ALBUM_PHOTOS);
    const pages = createAlbumLayout(photos);
    const laidOutPhotos = pages.flatMap((page) => page.photos);

    expect(laidOutPhotos.map((photo) => photo.id)).toEqual(photos.map((photo) => photo.id));
  });

  it("caps the album at twelve photos and creates varied compositions and note cards", () => {
    const pages = createAlbumLayout(createPhotos(16));
    const laidOutPhotos = pages.flatMap((page) => page.photos);

    expect(laidOutPhotos).toHaveLength(MAX_ALBUM_PHOTOS);
    expect(laidOutPhotos.map((photo) => photo.id)).toEqual(
      createPhotos(MAX_ALBUM_PHOTOS).map((photo) => photo.id),
    );
    expect(pages.map((page) => page.kind)).toEqual(
      expect.arrayContaining(["single", "stack", "feature", "grid", "note"]),
    );
    expect(pages.filter((page) => page.kind === "note").every((page) => page.caption)).toBe(true);
    expect(pages.find((page) => page.kind === "feature")?.photos).toHaveLength(3);
    expect(pages.find((page) => page.kind === "grid")?.photos).toHaveLength(3);
  });

  it("handles an empty album and a single photo", () => {
    expect(createAlbumLayout([])).toEqual([]);
    expect(createAlbumLayout(createPhotos(1))).toEqual([
      { kind: "stack", photos: [expect.objectContaining({ id: "photo-0" })] },
    ]);
  });
});
