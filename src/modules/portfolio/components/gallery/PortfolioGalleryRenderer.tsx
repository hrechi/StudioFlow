import { categoriePortfolioLabelsEn } from "../../portfolio.types";
import { resolveGalleryDisplayMode } from "../../lib/galleryDisplayModes";
import { PortfolioPhotoAlbum } from "./PortfolioPhotoAlbum";
import { EventGallery } from "./modes/EventGallery";
import { FashionGallery } from "./modes/FashionGallery";
import { GalleryPhotoGrid } from "./modes/GalleryPhotoGrid";
import { PortraitGallery } from "./modes/PortraitGallery";
import { ProductGallery } from "./modes/ProductGallery";
import type { FashionShoot, GalleryPhoto, ProductGalleryItem } from "./galleryTypes";

export function PortfolioGalleryRenderer({
  id,
  title,
  photographerName,
  portfolioId,
  slug,
  enableLikes,
  coverColor,
  mode,
  photos,
}: {
  id?: string;
  title: string;
  photographerName: string;
  portfolioId: string;
  slug: string;
  enableLikes: boolean;
  coverColor: string;
  mode: unknown;
  photos: GalleryPhoto[];
}) {
  const displayMode = resolveGalleryDisplayMode(mode);

  if (displayMode === "ALBUM_3D") {
    return (
      <PortfolioPhotoAlbum
        id={id}
        title={title}
        photographerName={photographerName}
        portfolioId={portfolioId}
        slug={slug}
        enableLikes={enableLikes}
        coverColor={coverColor}
        photos={photos}
      />
    );
  }

  if (displayMode === "SIMPLE") {
    return <GalleryPhotoGrid id={id} title={title} photos={photos} />;
  }

  if (displayMode === "PORTRAIT") {
    return <PortraitGallery id={id} title={title} photos={photos} />;
  }

  if (displayMode === "PRODUIT") {
    return <ProductGallery id={id} title={title} products={toProducts(photos)} />;
  }

  if (displayMode === "EVENEMENT") {
    return <EventGallery id={id} title={title} photos={photos} />;
  }

  const shoots = createFashionShoots(title, photos);
  return <FashionGallery id={id} shoots={shoots} />;
}

function toProducts(photos: GalleryPhoto[]): ProductGalleryItem[] {
  const grouped = new Map<string, GalleryPhoto[]>();

  for (const photo of photos) {
    const name = photo.title?.trim() || photo.caption?.trim() || photo.alt;
    const key = `${photo.category ?? ""}:${name.toLocaleLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), photo]);
  }

  return Array.from(grouped, ([key, images]) => {
    const name = images[0]?.title?.trim() || images[0]?.caption?.trim() || images[0]?.alt;
    return {
      id: key,
      name,
      category: images[0]?.category,
      images,
      images360: images.length > 1 ? images.map((image) => image.src) : undefined,
    };
  });
}

function createFashionShoots(title: string, photos: GalleryPhoto[]): FashionShoot[] {
  const grouped = new Map<string, GalleryPhoto[]>();

  for (const photo of photos) {
    const key = photo.category || "EDITORIAL";
    grouped.set(key, [...(grouped.get(key) ?? []), photo]);
  }

  return Array.from(grouped, ([category, shootPhotos]) => ({
    id: category,
    title:
      category === "EDITORIAL"
        ? title
        : categoriePortfolioLabelsEn[category as keyof typeof categoriePortfolioLabelsEn] || title,
    photos: shootPhotos,
  }));
}
