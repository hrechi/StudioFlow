import { describe, expect, it } from "vitest";
import { portfolioBlocksSchema, portfolioCreateSchema } from "../portfolio.schemas";

const id = "0123456789abcdef01234567";
const personalElement = (idElement: string, ordreAffichage = 0) => ({
  idElement,
  source: "UPLOAD_PERSONNEL",
  media: {
    url: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
    urlMiniature: "https://res.cloudinary.com/demo/image/upload/thumb.jpg",
    largeur: 1200,
    hauteur: 800,
    publicId: "portfolio/photo",
  },
  ordreAffichage,
  role: "NORMAL",
  statutConsentement: "NON_REQUIS",
  dateAjout: "2026-01-01T00:00:00.000Z",
});
const hero = (idBloc: string, ordre = 0) => ({
  idBloc,
  type: "HERO",
  ordre,
  miseEnPage: "GRILLE",
  configuration: { titre: "A portfolio", sousTitre: "Photography", texteBouton: "Contact" },
});

describe("portfolio schemas", () => {
  it("applies portfolio defaults and accepts HTTPS media", () => {
    const parsed = portfolioCreateSchema.parse({
      titre: "  Studio  ",
      photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
    });
    expect(parsed.titre).toBe("Studio");
    expect(parsed.theme).toBe("MINIMAL");
    expect(parsed.visibilite).toBe("PUBLIC");
  });

  it("rejects non-HTTPS covers", () => {
    expect(
      portfolioCreateSchema.safeParse({
        titre: "Studio",
        photoCouverture: "http://example.com/cover.jpg",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate hero blocks and non-contiguous order", () => {
    expect(
      portfolioBlocksSchema.safeParse([hero(id), hero("1123456789abcdef01234567", 1)]).success,
    ).toBe(false);
    expect(portfolioBlocksSchema.safeParse([{ ...hero(id), ordre: 1 }]).success).toBe(false);
  });

  it("rejects client gallery elements without client consent metadata", () => {
    const item = {
      ...personalElement("2123456789abcdef01234567"),
      source: "GALERIE_CLIENT",
      clientConcerne: id,
      statutConsentement: "EN_ATTENTE",
    };
    expect(portfolioBlocksSchema.safeParse([{ ...hero(id), elements: [item] }]).success).toBe(true);
    expect(
      portfolioBlocksSchema.safeParse([
        { ...hero(id), elements: [{ ...item, statutConsentement: "NON_REQUIS" }] },
      ]).success,
    ).toBe(false);
  });

  it("requires one before and one after element per pair", () => {
    const before = { ...personalElement("3123456789abcdef01234567"), role: "AVANT", paire: 1 };
    const after = { ...personalElement("4123456789abcdef01234567", 1), role: "APRES", paire: 1 };
    const block = {
      idBloc: "5123456789abcdef01234567",
      type: "AVANT_APRES",
      ordre: 0,
      miseEnPage: "GRILLE",
      configuration: {},
      elements: [before, after],
    };
    expect(portfolioBlocksSchema.safeParse([block]).success).toBe(true);
    expect(portfolioBlocksSchema.safeParse([{ ...block, elements: [before] }]).success).toBe(false);
  });
});
