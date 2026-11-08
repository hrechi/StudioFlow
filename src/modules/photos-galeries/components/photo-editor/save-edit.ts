/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { Photo } from "../../galerie.types";

/** "wedding-12.jpg" → "wedding-12-edited.jpg" (editing an edit does not stack the suffix). */
export function editedFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/-edited$/, "");
  return `${base}-edited.jpg`;
}

/** Loads a photo of the gallery (same origin, so a canvas can read its pixels). */
export function loadPhotoImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The photo could not be loaded."));
    image.src = url;
  });
}

/** Adds an edited JPEG to the photo's gallery, next to its original (which is never changed). */
export async function uploadEditedPhoto(photo: Photo, blob: Blob, style: string): Promise<void> {
  const form = new FormData();
  form.set("galerieId", photo.galerieId);
  form.set("photoOrigine", photo.id);
  form.set("styleApplique", style);
  form.set("file", new File([blob], editedFileName(photo.nomFichier), { type: "image/jpeg" }));
  const response = await fetch("/api/photos/upload", { method: "POST", body: form });
  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!result.ok) throw new Error(result.error ?? "The photo could not be saved.");
}
