import { describe, expect, it } from "vitest";
import {
  contactPortfolioSchema,
  portfolioBlocksSchema,
  portfolioCreateSchema,
  portfolioUpdateSchema,
} from "../portfolio.schemas";
import { INITIAL_DEMO_BLOCKS } from "../components/editor/demoData";

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
    expect(parsed.couleurAccent).toBe("#e0563b");
  });

  it("rejects non-HTTPS covers", () => {
    expect(
      portfolioCreateSchema.safeParse({
        titre: "Studio",
        photoCouverture: "http://example.com/cover.jpg",
      }).success,
    ).toBe(false);
  });

  it("accepts public profile and discovery metadata at creation", () => {
    const parsed = portfolioCreateSchema.parse({
      titre: "Studio Étoile",
      slogan: "Natural light and candid stories",
      bio: "A photography studio based in Tunis.",
      photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
      specialites: ["MARIAGE", "MODE"],
      styles: ["DOCUMENTAIRE", "ARTISTIQUE"],
      services: ["PHOTOGRAPHIE", "RETOUCHE"],
      disponible: true,
      ville: "Tunis",
      region: "Tunis Governorate",
      pays: "Tunisia",
      theme: "EDITORIAL",
      couleurAccent: "#c27a42",
      filigrane: true,
      visibilite: "PRIVE",
      liensSociaux: [{ reseau: "INSTAGRAM", url: "https://instagram.com/studio-etoile" }],
    });

    expect(parsed).toMatchObject({
      bio: "A photography studio based in Tunis.",
      styles: ["DOCUMENTAIRE", "ARTISTIQUE"],
      services: ["PHOTOGRAPHIE", "RETOUCHE"],
      disponible: true,
      region: "Tunis Governorate",
      pays: "Tunisia",
      theme: "EDITORIAL",
      visibilite: "PRIVE",
      liensSociaux: [{ reseau: "INSTAGRAM", url: "https://instagram.com/studio-etoile" }],
    });
  });

  it("accepts partial theme updates without applying unrelated creation defaults", () => {
    expect(portfolioUpdateSchema.parse({ theme: "SOMBRE" })).toEqual({ theme: "SOMBRE" });
    expect(portfolioUpdateSchema.parse({ couleurAccent: "#d97746" })).toEqual({
      couleurAccent: "#d97746",
    });
    expect(portfolioUpdateSchema.safeParse({ couleurAccent: "orange" }).success).toBe(false);
  });

  it("limits public contact messages to 500 characters", () => {
    const request = {
      portfolioId: id,
      nomVisiteur: "Camille",
      email: "camille@example.com",
      typeSeance: "PORTRAIT",
      message: "x".repeat(500),
    };

    expect(contactPortfolioSchema.safeParse(request).success).toBe(true);
    expect(
      contactPortfolioSchema.safeParse({ ...request, message: `${request.message}x` }).success,
    ).toBe(false);
  });

  it("rejects duplicate hero blocks and non-contiguous order", () => {
    expect(
      portfolioBlocksSchema.safeParse([hero(id), hero("1123456789abcdef01234567", 1)]).success,
    ).toBe(false);
    expect(portfolioBlocksSchema.safeParse([{ ...hero(id), ordre: 1 }]).success).toBe(false);
  });

  it("accepts galleries without obsolete grid configuration", () => {
    const gallery = {
      idBloc: "1123456789abcdef01234567",
      type: "GALERIE",
      ordre: 1,
      configuration: { titre: "Mariage" },
    };

    expect(portfolioBlocksSchema.safeParse([hero(id), gallery]).success).toBe(true);
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

  it("accepts the starter template blocks", () => {
    expect(portfolioBlocksSchema.safeParse(INITIAL_DEMO_BLOCKS).success).toBe(true);
  });

  it("accepts the editor-configured hero video and profile information", () => {
    const blocks = [
      {
        ...hero(id),
        configuration: {
          ...hero(id).configuration,
          videoFond: "/api/portfolio/media/6123456789abcdef01234567",
        },
      },
      {
        idBloc: "1123456789abcdef01234567",
        type: "A_PROPOS",
        ordre: 1,
        miseEnPage: "GRILLE",
        configuration: {
          titre: "Camille Rousseau",
          texte: "Photographie argentique à Lyon.",
          anneesExperience: 12,
          photoPortrait: "https://example.com/portrait.jpg",
          legendePortrait: "Dans la chambre noire",
          lieuBase: "Lyon, 2e",
          depuis: "2014, indépendante",
          materiel: "Mamiya RZ67 · Nikon FM2",
          langues: "Français, anglais",
        },
      },
    ];

    expect(portfolioBlocksSchema.safeParse(blocks).success).toBe(true);
  });

  it("rejects unsafe hero video URLs", () => {
    const block = {
      ...hero(id),
      configuration: { ...hero(id).configuration, videoFond: "http://example.com/film.mp4" },
    };

    expect(portfolioBlocksSchema.safeParse([block]).success).toBe(false);
  });

  it("allows an empty video URL and migrates the old placeholder", () => {
    const video = {
      idBloc: "000000000000000000000009",
      type: "VIDEO" as const,
      ordre: 0,
      visible: true,
      miseEnPage: "GRILLE" as const,
      configuration: {
        titre: "Film",
        urlVideo: "",
        affiche: "",
      },
      elements: [],
    };

    const emptyUrl = portfolioBlocksSchema.parse([
      { ...video, configuration: { ...video.configuration, urlVideo: "" } },
    ]);
    expect(emptyUrl[0].configuration.urlVideo).toBe("");

    const oldPlaceholder = portfolioBlocksSchema.parse([
      { ...video, configuration: { ...video.configuration, urlVideo: "https://" } },
    ]);
    expect(oldPlaceholder[0].configuration.urlVideo).toBe("");
  });

  it("still rejects insecure video URLs", () => {
    const videoBlock = {
      idBloc: "000000000000000000000009",
      type: "VIDEO" as const,
      ordre: 0,
      visible: true,
      miseEnPage: "GRILLE" as const,
      configuration: {
        titre: "Film",
        urlVideo: "https://vimeo.com/12345",
        affiche: "",
      },
      elements: [],
    };

    expect(
      portfolioBlocksSchema.safeParse([
        {
          ...videoBlock,
          ordre: 0,
          configuration: { ...videoBlock.configuration, urlVideo: "http://example.com" },
        },
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
