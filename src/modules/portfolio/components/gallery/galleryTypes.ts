import type { AlbumPhoto } from "../../lib/albumLayout";

export type GalleryPhoto = AlbumPhoto & {
  category?: string;
  highlighted?: boolean;
  width?: number;
  height?: number;
};

export type ProductGalleryItem = {
  id: string;
  name: string;
  category?: string;
  images: GalleryPhoto[];
  images360?: string[];
  price?: string;
  description?: string;
};

export type FashionShoot = {
  id: string;
  title: string;
  season?: string;
  photos: GalleryPhoto[];
};
