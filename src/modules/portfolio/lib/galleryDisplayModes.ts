export const GALLERY_DISPLAY_MODES = [
  "ALBUM_3D",
  "SIMPLE",
  "PORTRAIT",
  "PRODUIT",
  "EVENEMENT",
  "MODE",
] as const;

export type GalleryDisplayMode = (typeof GALLERY_DISPLAY_MODES)[number];

export function resolveGalleryDisplayMode(value: unknown): GalleryDisplayMode {
  if (value === "MUSEE") return "ALBUM_3D";
  return GALLERY_DISPLAY_MODES.find((mode) => mode === value) ?? "ALBUM_3D";
}
