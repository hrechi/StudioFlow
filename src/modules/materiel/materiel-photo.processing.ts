import sharp from "sharp";
import { ServiceError } from "@/lib/action-result";

export const MATERIEL_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;

/** Validates the decoded image format, fixes EXIF orientation, and stores a compact WebP. */
export async function processMaterielPhoto(data: Buffer): Promise<Buffer> {
  if (data.length > MATERIEL_PHOTO_MAX_BYTES) {
    throw new ServiceError("The image must be 5 MB or smaller.");
  }
  try {
    const metadata = await sharp(data).metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new ServiceError("Only JPG, PNG, and WebP images are allowed.");
    }
    return await sharp(data)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("The uploaded file is not a valid image.");
  }
}
