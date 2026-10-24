import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  exists: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn(),
  verifierRole: vi.fn(),
  connectDB: vi.fn(),
  listerAdmins: vi.fn(),
  envoyer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("../portfolio.model", () => ({
  Portfolio: { findById: mocks.findById, exists: mocks.exists, updateOne: mocks.updateOne, create: mocks.create },
  PortfolioStats: { updateOne: vi.fn() },
  DemandeContact: { create: vi.fn(), updateOne: vi.fn(), find: vi.fn() },
}));
vi.mock("../integrations", () => ({
  portfolioIntegrations: {
    utilisateursService: { listerAdmins: mocks.listerAdmins, verifierRole: mocks.verifierRole },
    notificationsService: { envoyer: mocks.envoyer },
  },
}));

import { createPortfolio, publishPortfolio } from "../portfolio.service";
import { portfolioCreateSchema } from "../portfolio.schemas";

describe("portfolio creation structure", () => {
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
    const created = mocks.create.mock.calls[0]?.[0] as { blocs: { type: string; ordre: number; configuration: Record<string, unknown> }[] };
    expect(created.blocs.map(({ type, ordre }) => [type, ordre])).toEqual([
      ["HERO", 0], ["A_PROPOS", 1], ["GALERIE", 2], ["CONTACT", 3],
    ]);
    expect(created.blocs[0]?.configuration.titre).toBe("Studio Étoile");
    expect(created.blocs[2]?.configuration.categorie).toBe("MARIAGE");
    expect(created).not.toHaveProperty("structureInitiale");
  });

  it("allows an explicitly blank portfolio", async () => {
    await createPortfolio(owner.toString(), { ...input, structureInitiale: "VIDE" });
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ blocs: [] });
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
          configuration: { titre: "Welcome", sousTitre: "Photo", texteBouton: "Contact" },
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
              source: "UPLOAD_PERSONNEL",
              media: {
                url: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
                urlMiniature: "https://res.cloudinary.com/demo/image/upload/thumb.jpg",
                largeur: 1200,
                hauteur: 800,
                publicId: "photo",
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
      "exactly one HERO",
    );
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
