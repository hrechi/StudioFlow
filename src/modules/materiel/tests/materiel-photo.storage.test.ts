import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processMaterielPhoto } from "../materiel-photo.processing";

describe("materiel photo processing", () => {
  it("normalizes a valid image to WebP and limits its width", async () => {
    const input = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 20, g: 40, b: 80 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await processMaterielPhoto(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1200);
  });

  it("rejects a non-image even when the file extension could be .jpg", async () => {
    await expect(processMaterielPhoto(Buffer.from("%PDF-1.7 fake document"))).rejects.toThrow(
      "valid image",
    );
  });

  it("rejects files larger than 5 MB", async () => {
    await expect(processMaterielPhoto(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toThrow(
      "5 MB or smaller",
    );
  });
});
