import { describe, expect, it } from "vitest";
import { resolveGalleryDisplayMode } from "../lib/galleryDisplayModes";
import { portfolioBlocksSchema } from "../portfolio.schemas";

describe("portfolio gallery display modes", () => {
  it("accepts every style that the editor can select", () => {
    const modes = ["ALBUM_3D", "SIMPLE", "PORTRAIT", "PRODUIT", "EVENEMENT", "MODE"];
    const blocks = modes.map((mode, index) => ({
      idBloc: `0123456789abcdef0123456${index}`,
      type: "GALERIE",
      ordre: index,
      visible: true,
      miseEnPage: "GRILLE",
      configuration: { modeAffichage: mode },
      elements: [],
    }));

    expect(portfolioBlocksSchema.safeParse(blocks).success).toBe(true);
    expect(
      portfolioBlocksSchema.safeParse([
        { ...blocks[0], configuration: { modeAffichage: "UNKNOWN" } },
      ]).success,
    ).toBe(false);
  });

  it("keeps existing gallery configurations compatible", () => {
    expect(resolveGalleryDisplayMode(undefined)).toBe("ALBUM_3D");
    expect(resolveGalleryDisplayMode("MUSEE")).toBe("ALBUM_3D");
    expect(resolveGalleryDisplayMode("SIMPLE")).toBe("SIMPLE");
  });
});
