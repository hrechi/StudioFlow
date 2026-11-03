export type GalleryPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  alt: string;
  width: number;
  height: number;
  likes: number;
}

export type GalleryWall = "north" | "east" | "south" | "west";

export type GalleryViewpoint = {
  photoIndex: number;
  position: [number, number, number];
  target: [number, number, number];
};

export type GalleryFramePlacement = {
  photoIndex: number;
  photo: GalleryPhoto;
  side: GalleryWall;
  position: [number, number, number];
  rotationY: number;
  normal: [number, number, number];
  width: number;
  height: number;
  viewpoint: GalleryViewpoint;
};

export type GalleryLayout = {
  width: number;
  depth: number;
  height: number;
  frames: GalleryFramePlacement[];
  viewpoints: GalleryViewpoint[];
};
