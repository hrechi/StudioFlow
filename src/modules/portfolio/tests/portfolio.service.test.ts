import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
  skip: vi.fn(),
  searchUserFind: vi.fn(),
  lookupUser: vi.fn(),
  exists: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn(),
  verifierRole: vi.fn(),
  getUtilisateur: vi.fn(),
  connectDB: vi.fn(),
  listerAdmins: vi.fn(),
  envoyer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("../portfolio.model", () => ({
  Portfolio: {
    findById: mocks.findById,
    findOne: mocks.findOne,
    find: mocks.find,
    countDocuments: mocks.countDocuments,
    exists: mocks.exists,
    updateOne: mocks.updateOne,
    create: mocks.create,
  },
  PortfolioStats: { updateOne: vi.fn() },
  DemandeContact: { create: vi.fn(), updateOne: vi.fn(), find: vi.fn() },
}));
vi.mock("@/modules/utilisateurs/utilisateur.model", () => ({
  Utilisateur: { find: mocks.searchUserFind },
}));
vi.mock("@/modules/utilisateurs/utilisateur.service", () => ({
  findUtilisateurById: mocks.lookupUser,
}));
vi.mock("../integrations", () => ({
  portfolioIntegrations: {
    utilisateursService: {
      listerAdmins: mocks.listerAdmins,
      verifierRole: mocks.verifierRole,
      getUtilisateur: mocks.getUtilisateur,
    },
    notificationsService: { envoyer: mocks.envoyer },
  },
}));

import {
  createPortfolio,
  getPortfolioDraftPreview,
  getPortfolioForEditor,
  getPortfolioForPublicRoute,
  getPublicPortfolio,
  listPublicPortfolios,
  publishPortfolio,
  savePortfolioBlocks,
} from "../portfolio.service";
import { portfolioCreateSchema, publicPortfolioSearchSchema } from "../portfolio.schemas";
import { INITIAL_DEMO_BLOCKS } from "../components/editor/demoData";

describe("portfolio creation structure", () => {
  it("keeps the setup screen's starter structure aligned with its nine-section description", () => {
    expect(INITIAL_DEMO_BLOCKS.map((block) => block.type)).toEqual([
      "HERO",
      "A_PROPOS",
      "GALERIE",
      "CASE_STUDY",
      "AVANT_APRES",
      "TEMOIGNAGES",
      "SERVICES",
      "STATISTIQUES",
      "CONTACT",
    ]);
    expect(INITIAL_DEMO_BLOCKS.find((block) => block.type === "GALERIE")?.elements).toEqual([]);
  });

  it("rejects gallery photos that were not selected from the MongoDB library", async () => {
    const heroBlock = {
      idBloc: "0123456789abcdef01234567",
      type: "HERO" as const,
      ordre: 0,
      visible: true,
      miseEnPage: "GRILLE" as const,
      configuration: { titre: "Studio", sousTitre: "", texteBouton: "Contact" },
      elements: [],
    };
    const galleryBlock = {
      idBloc: "1123456789abcdef01234567",
      type: "GALERIE" as const,
      ordre: 1,
      visible: true,
      miseEnPage: "GRILLE" as const,
      configuration: {},
      elements: [
        {
          idElement: "2123456789abcdef01234567",
          source: "UPLOAD_PERSONNEL" as const,
          media: {
            url: "https://example.com/photo.jpg",
            urlMiniature: "https://example.com/photo.jpg",
            largeur: 1200,
            hauteur: 800,
            publicId: "external",
          },
          ordreAffichage: 0,
          estMisEnAvant: false,
          role: "NORMAL" as const,
          statutConsentement: "NON_REQUIS" as const,
          nombreLikes: 0,
          dateAjout: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    await expect(
      savePortfolioBlocks("6123456789abcdef01234567", owner.toString(), [
        heroBlock,
        galleryBlock,
      ]),
    ).rejects.toThrow("uniquement des photos issues de votre bibliothèque ou téléversées directement");
  });

  const owner = new Types.ObjectId("0123456789abcdef01234567");
  const input = portfolioCreateSchema.parse({
    titre: "Studio Étoile",
    photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
    specialites: ["MARIAGE"],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifierRole.mockResolvedValue(true);
    mocks.exists.mockResolvedValue(false);
    mocks.create.mockImplementation(async (value: Record<string, unknown>) => ({
      _id: new Types.ObjectId("6123456789abcdef01234567"),
      ...value,
    }));
  });

  it("creates an editable starter with valid ordered blocks by default", async () => {
    await createPortfolio(owner.toString(), input);
    const created = mocks.create.mock.calls[0]?.[0] as {
      blocs: { type: string; ordre: number; configuration: Record<string, unknown> }[];
    };
    expect(created.blocs.map(({ type, ordre }) => [type, ordre])).toEqual([
      ["HERO", 0],
      ["A_PROPOS", 1],
      ["GALERIE", 2],
      ["CONTACT", 3],
    ]);
    expect(created.blocs[0]?.configuration.titre).toBe("Studio Étoile");
    expect(created.blocs[2]?.configuration.categorie).toBe("MARIAGE");
    expect(created).not.toHaveProperty("structureInitiale");
  });

  it("allows an explicitly blank portfolio", async () => {
    await createPortfolio(owner.toString(), { ...input, structureInitiale: "VIDE" });
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ blocs: [] });
  });

  it("persists profile and search metadata and uses the bio in its starter page", async () => {
    const profileInput = portfolioCreateSchema.parse({
      ...input,
      bio: "Studio stories in natural light.",
      styles: ["LIFESTYLE"],
      services: ["PHOTOGRAPHIE", "VIDEOGRAPHIE"],
      disponible: true,
      region: "Tunis Governorate",
      pays: "Tunisia",
      liensSociaux: [{ reseau: "INSTAGRAM", url: "https://instagram.com/studio" }],
    });

    await createPortfolio(owner.toString(), profileInput);

    const created = mocks.create.mock.calls[0]?.[0] as {
      bio: string;
      styles: string[];
      services: string[];
      disponible: boolean;
      region: string;
      pays: string;
      liensSociaux: { reseau: string; url: string }[];
      blocs: { type: string; configuration: Record<string, unknown> }[];
    };
    expect(created).toMatchObject({
      bio: "Studio stories in natural light.",
      styles: ["LIFESTYLE"],
      services: ["PHOTOGRAPHIE", "VIDEOGRAPHIE"],
      disponible: true,
      region: "Tunis Governorate",
      pays: "Tunisia",
      liensSociaux: [{ reseau: "INSTAGRAM", url: "https://instagram.com/studio" }],
    });
    expect(created.blocs.find((block) => block.type === "A_PROPOS")?.configuration.texte).toBe(
      "Studio stories in natural light.",
    );
  });

  it("hides legacy gallery photos that are not linked to MongoDB library records", async () => {
    const starterPhoto = {
      idElement: new Types.ObjectId("000000000000000000000101"),
      source: "GALERIE_CLIENT",
      media: {
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
        urlMiniature:
          "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=400&q=80",
        largeur: 800,
        hauteur: 600,
        publicId: "img-1",
      },
      ordreAffichage: 0,
      statutConsentement: "ACCORDE",
      dateAjout: new Date("2024-09-12T00:00:00.000Z"),
    };
    mocks.findById.mockImplementation(() => ({
      select: () => ({ lean: async () => ({ proprietaire: owner }) }),
      lean: async () => ({
        _id: new Types.ObjectId("6123456789abcdef01234567"),
        proprietaire: owner,
        titre: "Studio Étoile",
        photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        slug: "studio-etoile",
        blocs: [{ idBloc: new Types.ObjectId(), type: "GALERIE", elements: [starterPhoto] }],
        blocsPublies: [],
        dateCreation: new Date(),
        dateModification: new Date(),
      }),
    }));
    mocks.getUtilisateur.mockResolvedValue({ nom: "Studio", prenom: "Étoile" });

    const editorData = await getPortfolioForEditor("6123456789abcdef01234567", owner.toString());

    expect(editorData?.blocs[0]?.elements).toEqual([]);
  });
});

describe("publishPortfolio", () => {
  const owner = new Types.ObjectId("0123456789abcdef01234567");
  const portfolioId = new Types.ObjectId("1123456789abcdef01234567");
  const heroId = new Types.ObjectId("2123456789abcdef01234567");
  const uploadedElementId = new Types.ObjectId("3123456789abcdef01234567");
  const consentPendingId = new Types.ObjectId("4123456789abcdef01234567");
  let document: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    document = {
      _id: portfolioId,
      proprietaire: owner,
      titre: "Studio Étoile",
      photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
      slug: "studio-etoile",
      blocs: [
        {
          idBloc: heroId,
          type: "HERO",
          ordre: 0,
          visible: true,
          miseEnPage: "GRILLE",
          configuration: {
            titre: "Welcome",
            sousTitre: "Photo",
            texteBouton: "Contact",
          },
          elements: [],
        },
        {
          idBloc: new Types.ObjectId("5123456789abcdef01234567"),
          type: "GALERIE",
          ordre: 1,
          visible: true,
          miseEnPage: "GRILLE",
          configuration: { colonnes: 3, espacement: 12 },
          elements: [
            {
              idElement: uploadedElementId,
              photoId: "6123456789abcdef01234568",
              source: "UPLOAD_PERSONNEL",
              media: {
                url: "/api/portfolio/media/6123456789abcdef01234568",
                urlMiniature: "/api/portfolio/media/6123456789abcdef01234568?variant=miniature",
                largeur: 1200,
                hauteur: 800,
                publicId: "6123456789abcdef01234568",
              },
              ordreAffichage: 0,
              role: "NORMAL",
              statutConsentement: "NON_REQUIS",
              nombreLikes: 0,
            },
            {
              idElement: consentPendingId,
              source: "GALERIE_CLIENT",
              clientConcerne: owner,
              media: {
                url: "https://res.cloudinary.com/demo/image/upload/client.jpg",
                urlMiniature: "https://res.cloudinary.com/demo/image/upload/client-thumb.jpg",
                largeur: 1200,
                hauteur: 800,
                publicId: "client",
              },
              ordreAffichage: 1,
              role: "NORMAL",
              statutConsentement: "EN_ATTENTE",
              nombreLikes: 0,
            },
          ],
        },
      ],
    };
    mocks.findById.mockImplementation(() => ({
      select: () => ({ lean: async () => ({ proprietaire: owner }) }),
      lean: async () => document,
    }));
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.listerAdmins.mockResolvedValue([]);
    mocks.envoyer.mockResolvedValue(undefined);
  });

  it("publishes a frozen snapshot without client photos lacking consent", async () => {
    const result = await publishPortfolio(portfolioId.toString(), owner.toString());
    const update = mocks.updateOne.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
    const published = update.$set.blocsPublies as { elements: { idElement: Types.ObjectId }[] }[];
    expect(result.slug).toBe("studio-etoile");
    expect(result.removedElements).toEqual([consentPendingId.toString()]);
    expect(published[1]?.elements.map((element) => element.idElement.toString())).toEqual([
      uploadedElementId.toString(),
    ]);
    expect(update.$set.statut).toBe("PUBLIE");
  });

  it("does not publish a portfolio without a hero block", async () => {
    document.blocs = (document.blocs as { type: string }[]).filter(
      (block) => block.type !== "HERO",
    );
    await expect(publishPortfolio(portfolioId.toString(), owner.toString())).rejects.toThrow(
      "exactement un bloc Hero",
    );
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("caps gallery photos to a maximum of 12 elements when publishing", async () => {
    const galleryBlock = (document.blocs as { type: string; elements: unknown[] }[]).find(
      (b) => b.type === "GALERIE",
    )!;
    galleryBlock.elements = Array.from({ length: 15 }, (_, i) => ({
      idElement: new Types.ObjectId(),
      source: "UPLOAD_PERSONNEL",
      media: {
        url: `https://res.cloudinary.com/demo/image/upload/photo-${i}.jpg`,
        urlMiniature: `https://res.cloudinary.com/demo/image/upload/photo-${i}-thumb.jpg`,
        largeur: 1200,
        hauteur: 800,
        publicId: `photo-${i}`,
      },
      ordreAffichage: i,
      role: "NORMAL",
      statutConsentement: "NON_REQUIS",
      nombreLikes: 0,
    }));

    await publishPortfolio(portfolioId.toString(), owner.toString());
    const update = mocks.updateOne.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
    const published = update.$set.blocsPublies as { elements: unknown[] }[];
    expect(published[1]?.elements).toHaveLength(12);
  });

  it("allows publication with the configured cover image and no background video", async () => {
    const result = await publishPortfolio(portfolioId.toString(), owner.toString());
    expect(result.slug).toBe("studio-etoile");
    expect(mocks.updateOne).toHaveBeenCalled();
  });
});

describe("public portfolio visibility", () => {
  const owner = new Types.ObjectId("0123456789abcdef01234567");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found for a private portfolio requested by its direct slug", async () => {
    mocks.findOne.mockReturnValue({
      lean: async () => ({
        slug: "studio-prive",
        statut: "PUBLIE",
        visibilite: "PRIVE",
      }),
    });

    await expect(getPortfolioForPublicRoute("studio-prive")).resolves.toEqual({
      status: "NOT_FOUND",
      slug: "studio-prive",
    });
    expect(mocks.lookupUser).not.toHaveBeenCalled();
  });

  it("filters private portfolios from the public slug lookup", async () => {
    mocks.findOne.mockReturnValue({ lean: async () => null });

    await getPublicPortfolio("studio-prive");

    expect(mocks.findOne).toHaveBeenCalledWith({
      slug: "studio-prive",
      statut: "PUBLIE",
      visibilite: "PUBLIC",
    });
  });

  it("loads the draft preview only for the authenticated owner's portfolio", async () => {
    mocks.findOne.mockReturnValue({
      lean: async () => ({
        _id: new Types.ObjectId("6123456789abcdef01234567"),
        proprietaire: owner,
        slug: "studio-prive",
        titre: "Studio privé",
        photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        specialites: [],
        styles: [],
        services: [],
        theme: "MINIMAL",
        couleurAccent: "#e0563b",
        filigrane: false,
        seo: { metaTitre: "Studio privé", metaDescription: "" },
        liensSociaux: [],
        blocs: [],
        blocsPublies: [],
        nombreVues: 0,
      }),
    });
    mocks.lookupUser.mockResolvedValue({ nom: "Photo", prenom: "Studio" });

    const preview = await getPortfolioDraftPreview(owner.toString());

    expect(mocks.findOne).toHaveBeenCalledWith({ proprietaire: owner });
    expect(preview).toMatchObject({
      slug: "studio-prive",
      photographe: { nom: "Photo", prenom: "Studio" },
      blocsPublies: [],
    });
  });
});

describe("public portfolio media", () => {
  it("serializes configured block images to public media URLs", async () => {
    const owner = new Types.ObjectId("0123456789abcdef01234567");
    mocks.findOne.mockReturnValue({
      lean: async () => ({
        _id: new Types.ObjectId("1123456789abcdef01234567"),
        proprietaire: owner,
        slug: "studio-etoile",
        titre: "Studio Étoile",
        photoCouverture: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        filigrane: false,
        blocsPublies: [
          {
            idBloc: "profile",
            type: "A_PROPOS",
            ordre: 1,
            visible: true,
            miseEnPage: "GRILLE",
            configuration: {
              photoPortrait: "/api/photos/portrait-id/file",
              photo: "/api/photos/case-study-id/miniature",
              affiche: "/api/photos/video-poster-id/file",
              photoAvant: "/api/photos/before-id/file",
              photoApres: "/api/photos/after-id/file",
              videoFond: "/api/portfolio/media/6123456789abcdef01234567",
            },
            elements: [],
          },
          {
            idBloc: "gallery",
            type: "GALERIE",
            ordre: 2,
            visible: true,
            miseEnPage: "GRILLE",
            configuration: {},
            elements: [
              {
                idElement: "gallery-photo",
                photoId: "6123456789abcdef01234568",
                media: {
                  url: "/api/portfolio/media/6123456789abcdef01234568",
                  urlMiniature:
                    "/api/portfolio/media/6123456789abcdef01234568?variant=miniature",
                  largeur: 1600,
                  hauteur: 1200,
                  publicId: "6123456789abcdef01234568",
                },
                ordreAffichage: 0,
                estMisEnAvant: false,
                role: "NORMAL",
                nombreLikes: 0,
              },
            ],
          },
        ],
      }),
    });
    mocks.lookupUser.mockResolvedValue({
      id: owner.toString(),
      nom: "Studio",
      prenom: "Étoile",
      photoProfil: "https://res.cloudinary.com/demo/image/upload/profile.jpg",
      role: "PHOTOGRAPHE",
      statut: "ACTIF",
    });

    const portfolio = await getPublicPortfolio("studio-etoile");

    expect(portfolio?.photographe).toMatchObject({
      nom: "Studio",
      prenom: "Étoile",
      photoProfil: "https://res.cloudinary.com/demo/image/upload/profile.jpg",
    });
    expect(portfolio?.blocsPublies[0]?.configuration).toEqual({
      photoPortrait: "/api/portfolio/media/portrait-id",
      photo: "/api/portfolio/media/case-study-id?variant=miniature",
      affiche: "/api/portfolio/media/video-poster-id",
      photoAvant: "/api/portfolio/media/before-id",
      photoApres: "/api/portfolio/media/after-id",
      videoFond: "/api/portfolio/media/6123456789abcdef01234567",
    });
    expect(portfolio?.blocsPublies[1]?.elements[0]?.media.urlMiniature).toBe(
      "/api/portfolio/media/6123456789abcdef01234568?variant=miniature",
    );
  });
});

describe("public portfolio search", () => {
  const owner = new Types.ObjectId("0123456789abcdef01234567");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockReturnValue({
      sort: () => ({
        skip: (value: number) => {
          mocks.skip(value);
          return {
            limit: () => ({ lean: async () => [] }),
          };
        },
      }),
    });
    mocks.countDocuments.mockResolvedValue(0);
    mocks.searchUserFind.mockReturnValue({
      select: () => ({ lean: async () => [{ _id: owner }] }),
    });
  });

  it("combines all selected filters and only queries published public portfolios", async () => {
    const query = publicPortfolioSearchSchema.parse({
      recherche: "Studio",
      ville: "Tunis",
      categories: ["MARIAGE", "MODE"],
      styles: ["ARTISTIQUE"],
      services: ["PHOTOGRAPHIE", "RETOUCHE"],
      disponible: true,
      page: 2,
    });

    await listPublicPortfolios(query);

    const filter = mocks.find.mock.calls[0]?.[0];
    expect(filter).toMatchObject({
      statut: "PUBLIE",
      visibilite: "PUBLIC",
      specialites: { $all: ["MARIAGE", "MODE"] },
      styles: { $all: ["ARTISTIQUE"] },
      services: { $all: ["PHOTOGRAPHIE", "RETOUCHE"] },
      disponible: true,
    });
    expect(filter.$or).toEqual([
      { ville: expect.any(RegExp) },
      { region: expect.any(RegExp) },
      { pays: expect.any(RegExp) },
    ]);
    expect(filter.$or[0].ville.test("Grand Tunis")).toBe(true);
    expect(filter.$and).toContainEqual({
      $or: expect.arrayContaining([{ proprietaire: { $in: [owner] } }]),
    });
    expect(mocks.skip).toHaveBeenCalledWith(12);
  });
});
