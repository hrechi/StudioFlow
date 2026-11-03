import { describe, expect, it } from "vitest";
import { createGalleryLayout, MAX_GALLERY_PHOTOS } from "../components/gallery3d/layout";
import type { GalleryPhoto } from "../components/gallery3d/types";

const photos: GalleryPhoto[] = Array.from({ length: 9 }, (_, index) => ({
  id: `photo-${index}`,
  url: `/photos/${index}.jpg`,
  thumbnailUrl: `/photos/${index}-small.jpg`,
  title: `Photo ${index}`,
  description: "",
  alt: `Photographie ${index}`,
  width: index % 2 === 0 ? 1600 : 900,
  height: index % 2 === 0 ? 900 : 1600,
  likes: 0,
}));

describe("3D portfolio gallery layout", () => {
  it("places every photo once and keeps navigation indexes aligned", () => {
    const layout = createGalleryLayout(photos);

    expect(layout.frames).toHaveLength(photos.length);
    expect(layout.frames.map((frame) => frame.photoIndex).sort((a, b) => a - b)).toEqual(
      photos.map((_, index) => index),
    );
    expect(
      layout.viewpoints.map((viewpoint) => viewpoint.photoIndex).sort((a, b) => a - b),
    ).toEqual(photos.map((_, index) => index));
  });

  it("scales the room and keeps photo frames near eye level", () => {
    const layout = createGalleryLayout(photos);

    expect(layout.width).toBeGreaterThan(12);
    expect(layout.depth).toBeGreaterThan(12);
    expect(layout.frames.every((frame) => frame.position[1] === 1.65)).toBe(true);
    expect(layout.frames.every((frame) => frame.width > 0 && frame.height > 0)).toBe(true);
    expect(layout.frames.every((frame) => frame.width <= 2.65 && frame.height <= 2.55)).toBe(true);
  });

  it("limits the exhibition to twelve photos and keeps frames separated", () => {
    const manyPhotos = Array.from({ length: 16 }, (_, index) => ({
      ...photos[index % photos.length],
      id: `extra-${index}`,
    }));
    const layout = createGalleryLayout(manyPhotos);

    expect(layout.frames).toHaveLength(MAX_GALLERY_PHOTOS);
    expect(layout.frames.map((frame) => frame.photoIndex).sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_GALLERY_PHOTOS }, (_, index) => index),
    );

    for (const side of ["north", "east", "south", "west"] as const) {
      const framesOnSide = layout.frames
        .filter((frame) => frame.side === side)
        .sort((a, b) => {
          const aPosition = side === "north" || side === "south" ? a.position[0] : a.position[2];
          const bPosition = side === "north" || side === "south" ? b.position[0] : b.position[2];
          return aPosition - bPosition;
        });

      for (let index = 1; index < framesOnSide.length; index += 1) {
        const previous = framesOnSide[index - 1];
        const current = framesOnSide[index];
        const previousPosition =
          side === "north" || side === "south" ? previous.position[0] : previous.position[2];
        const currentPosition =
          side === "north" || side === "south" ? current.position[0] : current.position[2];
        const clearGap =
          currentPosition - previousPosition - (previous.width + current.width + 0.4) / 2;

        expect(clearGap).toBeGreaterThanOrEqual(0.65);
      }
    }
  });

  it("keeps image order contiguous from wall to wall", () => {
    const layout = createGalleryLayout(photos);
    const orderByWall = (side: (typeof layout.frames)[number]["side"]) =>
      layout.frames
        .filter((frame) => frame.side === side)
        .map((frame) => frame.photoIndex)
        .sort((a, b) => a - b);

    expect(orderByWall("north")).toEqual([0, 1, 2]);
    expect(orderByWall("east")).toEqual([3, 4]);
    expect(orderByWall("south")).toEqual([5, 6]);
    expect(orderByWall("west")).toEqual([7, 8]);
  });
});
