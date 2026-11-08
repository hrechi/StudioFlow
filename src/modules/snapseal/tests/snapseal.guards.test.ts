import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phases 3 and 5: locks and client gates, on a sealed required gallery — and none of them on a
 * gallery without the option (old documents have no field at all).
 */

const m = vi.hoisted(() => ({
  galerie: vi.fn(),
  seal: vi.fn(),
  readGalleryState: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/modules/utilisateurs/notification.service", () => ({ createNotification: vi.fn() }));
vi.mock("@/modules/photos-galeries/photo.storage", () => ({ deleteFiles: vi.fn() }));
vi.mock("@/modules/photos-galeries/galerie.model", () => ({
  Galerie: { findById: () => ({ select: () => ({ lean: m.galerie }) }), updateOne: vi.fn() },
}));
vi.mock("../snapseal.model", () => ({
  GalerieSeal: { findOne: () => ({ lean: m.seal }), updateOne: vi.fn() },
}));
vi.mock("../snapseal.config", () => ({
  getSnapSealConfig: () => ({ registryAddress: "0xe78a", chainId: 1337, rpcUrl: "http://x" }),
}));
vi.mock("../snapseal.server-chain", async () => {
  const { ServiceError } = await import("@/lib/action-result");
  class ChainUnavailableError extends ServiceError {
    constructor() {
      super("down");
    }
  }
  return { ChainUnavailableError, readGalleryState: m.readGalleryState };
});

const g = await import("../snapseal.guards");
const { ChainUnavailableError } = await import("../snapseal.server-chain");

const galerieId = new Types.ObjectId();
const sealedPhoto = new Types.ObjectId();
const editedCopy = new Types.ObjectId();
const H1 = `0x${"11".repeat(32)}`;

function galerie(required: boolean | undefined, statut = "PARTAGEE") {
  return {
    _id: galerieId,
    titre: "T",
    client: new Types.ObjectId(),
    statut,
    ...(required === undefined ? {} : { preuveBlockchainRequise: required }),
  };
}
const seal = (over: object = {}) => ({
  _id: new Types.ObjectId(),
  onChainId: 3,
  photos: [{ photo: sealedPhoto, nomFichier: "a.jpg", hash: H1 }],
  ...over,
});
const emptyChain = {
  photographer: "0x1",
  client: "0x2",
  photoCount: 1,
  createdAt: 1,
  selectionHashes: [],
  selectedAt: 0,
  deliveryHash: null,
  deliveredAt: 0,
  confirmedAt: 0,
};

beforeEach(() => vi.clearAllMocks());

describe("on a gallery without the option (old document: no field)", () => {
  beforeEach(() => {
    m.galerie.mockResolvedValue(galerie(undefined, "EN_TRI"));
    m.seal.mockResolvedValue(seal());
  });
  it("applies no lock and no gate, even when sealed", async () => {
    await expect(g.assertMayShare(galerieId)).resolves.toBeUndefined();
    await expect(g.assertUploadAllowed(galerieId)).resolves.toBeUndefined();
    await expect(
      g.assertPhotosChangeAllowed([{ _id: sealedPhoto, galerie: galerieId }], "delete"),
    ).resolves.toBeUndefined();
    await expect(g.assertGalerieEditAllowed(galerieId, { client: true, statut: true })).resolves.toBeUndefined();
    expect(await g.clientOriginalsGate(galerieId)).toBe("ok");
    expect(await g.clientMaySeePhoto(galerieId, editedCopy.toString())).toBe(true);
    expect(m.readGalleryState).not.toHaveBeenCalled();
  });
});

describe("on a required gallery not sealed yet", () => {
  beforeEach(() => {
    m.galerie.mockResolvedValue(galerie(true, "EN_TRI"));
    m.seal.mockResolvedValue(null);
  });
  it("refuses to share it", async () => {
    await expect(g.assertMayShare(galerieId)).rejects.toThrow(/seal it/);
  });
  it("still allows uploads, culling and edits before sealing", async () => {
    await expect(g.assertUploadAllowed(galerieId)).resolves.toBeUndefined();
    await expect(
      g.assertPhotosChangeAllowed([{ _id: sealedPhoto, galerie: galerieId }], "culling"),
    ).resolves.toBeUndefined();
    await expect(g.assertGalerieEditAllowed(galerieId, { client: true, statut: false })).resolves.toBeUndefined();
  });
});

describe("on a sealed required gallery", () => {
  beforeEach(() => {
    m.galerie.mockResolvedValue(galerie(true));
    m.seal.mockResolvedValue(seal());
  });

  it("allows sharing", async () => {
    await expect(g.assertMayShare(galerieId)).resolves.toBeUndefined();
  });

  it("locks the client, the step, and the sealed photos", async () => {
    await expect(g.assertGalerieEditAllowed(galerieId, { client: true, statut: false })).rejects.toThrow(/client/);
    await expect(g.assertGalerieEditAllowed(galerieId, { client: false, statut: true })).rejects.toThrow(/step/);
    await expect(
      g.assertPhotosChangeAllowed([{ _id: sealedPhoto, galerie: galerieId }], "delete"),
    ).rejects.toThrow(/deleted/);
    await expect(
      g.assertPhotosChangeAllowed([{ _id: sealedPhoto, galerie: galerieId }], "culling"),
    ).rejects.toThrow(/kept or rejected/);
  });

  it("lets the studio manage photos outside the seal (its retouched copies)", async () => {
    await expect(
      g.assertPhotosChangeAllowed([{ _id: editedCopy, galerie: galerieId }], "delete"),
    ).resolves.toBeUndefined();
  });

  it("refuses new photos, and edited copies before the selection", async () => {
    m.readGalleryState.mockResolvedValue(emptyChain);
    await expect(g.assertUploadAllowed(galerieId)).rejects.toThrow(/can't be added/);
    await expect(g.assertUploadAllowed(galerieId, new Types.ObjectId())).rejects.toThrow(/sealed photos/);
    await expect(g.assertUploadAllowed(galerieId, sealedPhoto)).rejects.toThrow(/validated their selection/);
  });

  it("accepts an edited copy of a sealed photo once the selection is verified", async () => {
    m.seal.mockResolvedValue(seal({ selectionAt: new Date(), selectedHashes: [H1] }));
    await expect(g.assertUploadAllowed(galerieId, sealedPhoto)).resolves.toBeUndefined();
  });

  it("client: previews only (no originals) before the selection, and only sealed photos", async () => {
    m.readGalleryState.mockResolvedValue(emptyChain);
    expect(await g.clientOriginalsGate(galerieId)).toBe("refused");
    expect(await g.clientMaySeePhoto(galerieId, sealedPhoto.toString())).toBe(true);
    expect(await g.clientMaySeePhoto(galerieId, editedCopy.toString())).toBe(false);
  });

  it("client: originals once the selection is saved, without reading the chain", async () => {
    m.seal.mockResolvedValue(seal({ selectionAt: new Date(), selectedHashes: [H1] }));
    expect(await g.clientOriginalsGate(galerieId)).toBe("ok");
    expect(m.readGalleryState).not.toHaveBeenCalled();
  });

  it("fails closed: chain down and nothing saved → unavailable, not open", async () => {
    m.readGalleryState.mockRejectedValue(new ChainUnavailableError());
    expect(await g.clientOriginalsGate(galerieId)).toBe("unavailable");
    expect(await g.clientDeliveryGate(galerieId)).toBe("refused"); // no package stored at all
  });

  it("delivered retouched copies: hidden until the delivery is verified, then viewable and downloadable", async () => {
    const hash = `0x${"aa".repeat(32)}`;
    const livraison = { hash, fichier: new Types.ObjectId(), photos: [editedCopy] };
    m.seal.mockResolvedValue(seal({ selectionAt: new Date(), livraison }));
    expect(await g.clientMaySeePhoto(galerieId, editedCopy.toString())).toBe(false);
    expect(await g.clientMayDownloadDelivered(galerieId, editedCopy.toString())).toBe(false);

    m.seal.mockResolvedValue(
      seal({ selectionAt: new Date(), livraison, deliveredAt: new Date(), deliveryHash: hash }),
    );
    expect(await g.clientMaySeePhoto(galerieId, editedCopy.toString())).toBe(true);
    expect(await g.clientMayDownloadDelivered(galerieId, editedCopy.toString())).toBe(true);
    const outside = new Types.ObjectId().toString();
    expect(await g.clientMaySeePhoto(galerieId, outside)).toBe(false);
    expect(await g.clientMayDownloadDelivered(galerieId, outside)).toBe(false);
  });

  it("delivery: refused until the on-chain hash matches the stored package", async () => {
    const livraison = { hash: `0x${"aa".repeat(32)}`, fichier: new Types.ObjectId() };
    m.seal.mockResolvedValue(seal({ selectionAt: new Date(), livraison }));
    m.readGalleryState.mockResolvedValue({
      ...emptyChain,
      selectedAt: 1,
      deliveredAt: 2,
      deliveryHash: `0x${"bb".repeat(32)}`,
    });
    expect(await g.clientDeliveryGate(galerieId)).toBe("refused");
    m.seal.mockResolvedValue(
      seal({ selectionAt: new Date(), livraison, deliveredAt: new Date(), deliveryHash: livraison.hash }),
    );
    expect(await g.clientDeliveryGate(galerieId)).toBe("ok");
  });
});
