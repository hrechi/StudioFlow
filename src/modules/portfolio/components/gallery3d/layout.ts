import type { GalleryFramePlacement, GalleryLayout, GalleryPhoto, GalleryWall } from "./types";

const WALLS: readonly GalleryWall[] = ["north", "east", "south", "west"];
const EYE_LEVEL = 1.65;
export const MAX_GALLERY_PHOTOS = 12;
const WALL_MARGIN = 1.5;
const FRAME_GAP = 0.65;

function frameSize(photo: GalleryPhoto): { width: number; height: number } {
  const aspect = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 3;
  const height = Math.min(2.4, 2.35 / Math.max(aspect, 0.01));
  const width = height * aspect;
  const scale = Math.min(1, 2.65 / width, 2.55 / height);
  return { width: width * scale, height: height * scale };
}

function sidePoint(
  side: GalleryWall,
  index: number,
  count: number,
  width: number,
  depth: number,
): {
  position: [number, number, number];
  rotationY: number;
  normal: [number, number, number];
  span: number;
} {
  const span = side === "north" || side === "south" ? width : depth;
  const margin = WALL_MARGIN;
  const slot = -span / 2 + margin + ((span - margin * 2) * (index + 1)) / (count + 1);
  switch (side) {
    case "north":
      return {
        position: [slot, EYE_LEVEL, -depth / 2 + 0.11],
        rotationY: 0,
        normal: [0, 0, 1],
        span,
      };
    case "east":
      return {
        position: [width / 2 - 0.11, EYE_LEVEL, slot],
        rotationY: -Math.PI / 2,
        normal: [-1, 0, 0],
        span,
      };
    case "south":
      return {
        position: [slot, EYE_LEVEL, depth / 2 - 0.11],
        rotationY: Math.PI,
        normal: [0, 0, -1],
        span,
      };
    case "west":
      return {
        position: [-width / 2 + 0.11, EYE_LEVEL, slot],
        rotationY: Math.PI / 2,
        normal: [1, 0, 0],
        span,
      };
  }
}

export function createGalleryLayout(photos: GalleryPhoto[]): GalleryLayout {
  const displayedPhotos = photos.slice(0, MAX_GALLERY_PHOTOS);
  const wallPhotos = new Map<GalleryWall, { photo: GalleryPhoto; photoIndex: number }[]>(
    WALLS.map((wall) => [wall, []]),
  );
  let nextPhotoIndex = 0;
  const photosPerWall = Math.floor(displayedPhotos.length / WALLS.length);
  const extraPhotos = displayedPhotos.length % WALLS.length;
  WALLS.forEach((wall, wallIndex) => {
    const count = photosPerWall + (wallIndex < extraPhotos ? 1 : 0);
    wallPhotos.set(
      wall,
      displayedPhotos
        .slice(nextPhotoIndex, nextPhotoIndex + count)
        .map((photo, index) => ({ photo, photoIndex: nextPhotoIndex + index })),
    );
    nextPhotoIndex += count;
  });

  const maxFrameWidth = (walls: readonly GalleryWall[]) =>
    Math.max(
      0,
      ...walls.flatMap((wall) =>
        (wallPhotos.get(wall) ?? []).map(({ photo }) => frameSize(photo).width + 0.2),
      ),
    );
  const maxWallCount = (walls: readonly GalleryWall[]) =>
    Math.max(0, ...walls.map((wall) => wallPhotos.get(wall)?.length ?? 0));
  const wallSpan = (walls: readonly GalleryWall[]) =>
    Math.max(12, 2 * WALL_MARGIN + (maxWallCount(walls) + 1) * (maxFrameWidth(walls) + FRAME_GAP));
  const width = wallSpan(["north", "south"]);
  const depth = wallSpan(["east", "west"]);
  const height = 5.2;

  const frames: GalleryFramePlacement[] = WALLS.flatMap((side) => {
    const sidePhotos = wallPhotos.get(side) ?? [];
    return sidePhotos.map(({ photo, photoIndex }, index) => {
      const { position, rotationY, normal, span } = sidePoint(
        side,
        index,
        sidePhotos.length,
        width,
        depth,
      );
      const size = frameSize(photo);
      const viewpoint: GalleryFramePlacement["viewpoint"] = {
        photoIndex,
        position: [
          position[0] + normal[0] * Math.min(3.2, span * 0.24),
          EYE_LEVEL,
          position[2] + normal[2] * Math.min(3.2, span * 0.24),
        ],
        target: [position[0], position[1], position[2]],
      };
      return { photoIndex, photo, side, position, rotationY, normal, ...size, viewpoint };
    });
  });

  return { width, depth, height, frames, viewpoints: frames.map((frame) => frame.viewpoint) };
}
