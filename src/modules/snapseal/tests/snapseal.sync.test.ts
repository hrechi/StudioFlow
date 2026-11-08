import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainState } from "../snapseal.chain";

/** Phase 1: chain facts → saved facts and status (no network, no database). */

const m = vi.hoisted(() => ({
  galerie: vi.fn(),
  seal: vi.fn(),
  sealUpdate: vi.fn(),
  galerieUpdate: vi.fn(),
  readGalleryState: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/modules/utilisateurs/notification.service", () => ({ createNotification: m.notify }));
vi.mock("@/modules/photos-galeries/photo.storage", () => ({ deleteFiles: vi.fn() }));
vi.mock("@/modules/photos-galeries/galerie.model", () => ({
  Galerie: {
    findById: () => ({ select: () => ({ lean: m.galerie }) }),
    updateOne: m.galerieUpdate,
  },
}));
vi.mock("../snapseal.model", () => ({
  GalerieSeal: { findOne: () => ({ lean: m.seal }), updateOne: m.sealUpdate },
}));
vi.mock("../snapseal.config", () => ({
  getSnapSealConfig: () => ({
    registryAddress: "0xe78a0f7e598cc8b0bb87894b0f60dd2a88d6a8ab",
    deliveryAddress: "0x5b1869d9a4c187f2eaa108f3062412ecf0526b24",
    chainId: 1337,
    networkName: "Ganache",
    rpcUrl: "http://127.0.0.1:7545",
    explorerUrl: null,
  }),
}));
vi.mock("../snapseal.server-chain", async () => {
  const { ServiceError } = await import("@/lib/action-result");
  class ChainUnavailableError extends ServiceError {}
  return { ChainUnavailableError, readGalleryState: m.readGalleryState };
});

const { planProofSync, syncGalerieProof, deliveryVerified } = await import("../snapseal.guards");
const { ChainUnavailableError } = await import("../snapseal.server-chain");

const H1 = `0x${"11".repeat(32)}`;
const H2 = `0x${"22".repeat(32)}`;
const PACKAGE = `0x${"aa".repeat(32)}`;

function chain(over: Partial<ChainState> = {}): ChainState {
  return {
    photographer: "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1",
    client: "0xffcf8fdee72ac11b5c542428b35eef5769c409f0",
    photoCount: 2,
    createdAt: 1_700_000_000,
    selectionHashes: [],
    selectedAt: 0,
    deliveryHash: null,
    deliveredAt: 0,
    confirmedAt: 0,
    ...over,
  };
}

describe("planProofSync", () => {
  it("moves a shared gallery to Approved when the selection is on-chain, and saves it", () => {
    const plan = planProofSync({
      required: true,
      statut: "PARTAGEE",
      saved: {},
      chain: chain({ selectedAt: 1_700_000_100, selectionHashes: [H1.toUpperCase().replace("0X", "0x")] }),
    });
    expect(plan.statut).toBe("VALIDEE");
    expect(plan.facts.selectedHashes).toEqual([H1]);
    expect(plan.facts.selectionAt).toEqual(new Date(1_700_000_100 * 1000));
  });

  it("goes on to Delivered only when the on-chain hash is the stored package", () => {
    const delivered = chain({ selectedAt: 1, selectionHashes: [H1], deliveredAt: 2, deliveryHash: PACKAGE });
    expect(
      planProofSync({ required: true, statut: "PARTAGEE", saved: {}, livraisonHash: PACKAGE, chain: delivered })
        .statut,
    ).toBe("LIVREE");
    const mismatch = planProofSync({
      required: true,
      statut: "VALIDEE",
      saved: { selectionAt: new Date(1000) },
      livraisonHash: H2,
      chain: delivered,
    });
    expect(mismatch.statut).toBeNull();
    // The on-chain fact is still saved: it is final, it just doesn't unlock anything.
    expect(mismatch.facts.deliveryHash).toBe(PACKAGE);
  });

  it("never moves backward, and never moves a gallery without the option", () => {
    const selected = chain({ selectedAt: 1, selectionHashes: [H1] });
    expect(planProofSync({ required: true, statut: "LIVREE", saved: {}, chain: selected }).statut).toBeNull();
    expect(planProofSync({ required: true, statut: "EN_TRI", saved: {}, chain: selected }).statut).toBeNull();
    expect(planProofSync({ required: false, statut: "PARTAGEE", saved: {}, chain: selected }).statut).toBeNull();
  });

  it("doesn't rewrite facts already saved (they are final on-chain)", () => {
    const plan = planProofSync({
      required: true,
      statut: "VALIDEE",
      saved: { selectionAt: new Date(5000), selectedHashes: [H1] },
      chain: chain({ selectedAt: 9, selectionHashes: [H2] }),
    });
    expect(plan.facts).toEqual({});
    expect(plan.statut).toBeNull();
  });
});

describe("deliveryVerified", () => {
  const livraison = { hash: PACKAGE } as never;
  it("needs the date, the stored package and the same hash", () => {
    expect(deliveryVerified({ deliveredAt: new Date(), deliveryHash: PACKAGE, livraison })).toBe(true);
    expect(deliveryVerified({ deliveredAt: new Date(), deliveryHash: H1, livraison })).toBe(false);
    expect(deliveryVerified({ deliveredAt: undefined, deliveryHash: PACKAGE, livraison })).toBe(false);
    expect(deliveryVerified({ deliveredAt: new Date(), deliveryHash: PACKAGE, livraison: undefined })).toBe(false);
  });
});

describe("syncGalerieProof", () => {
  const galerieId = new Types.ObjectId();
  const clientId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    m.galerie.mockResolvedValue({
      _id: galerieId,
      titre: "Test",
      client: clientId,
      statut: "VALIDEE",
      preuveBlockchainRequise: true,
    });
    m.seal.mockResolvedValue({
      _id: new Types.ObjectId(),
      onChainId: 7,
      photos: [],
      selectionAt: new Date(1000),
      selectedHashes: [H1],
      livraison: { hash: PACKAGE },
    });
  });

  it("leaves everything unchanged when the chain can't be read", async () => {
    m.readGalleryState.mockRejectedValue(new ChainUnavailableError());
    await expect(syncGalerieProof(galerieId)).rejects.toBeInstanceOf(ChainUnavailableError);
    expect(m.sealUpdate).not.toHaveBeenCalled();
    expect(m.galerieUpdate).not.toHaveBeenCalled();
  });

  it("saves the delivery, moves to Delivered once, and notifies the client", async () => {
    m.readGalleryState.mockResolvedValue(
      chain({ selectedAt: 1, selectionHashes: [H1], deliveredAt: 2, deliveryHash: PACKAGE }),
    );
    const result = await syncGalerieProof(galerieId);
    expect(result.galerie.statut).toBe("LIVREE");
    expect(m.galerieUpdate).toHaveBeenCalledWith(
      { _id: galerieId, statut: "VALIDEE" },
      { $set: { statut: "LIVREE" } },
    );
    expect(m.notify).toHaveBeenCalledOnce();
    expect(m.notify.mock.calls[0][0].utilisateurId).toBe(clientId.toString());
  });

  it("is harmless to run twice: nothing new to save, no second move", async () => {
    m.galerie.mockResolvedValue({
      _id: galerieId,
      titre: "Test",
      client: clientId,
      statut: "LIVREE",
      preuveBlockchainRequise: true,
    });
    m.seal.mockResolvedValue({
      _id: new Types.ObjectId(),
      onChainId: 7,
      photos: [],
      selectionAt: new Date(1000),
      selectedHashes: [H1],
      deliveredAt: new Date(2000),
      deliveryHash: PACKAGE,
      livraison: { hash: PACKAGE },
    });
    m.readGalleryState.mockResolvedValue(
      chain({ selectedAt: 1, selectionHashes: [H1], deliveredAt: 2, deliveryHash: PACKAGE }),
    );
    await syncGalerieProof(galerieId);
    expect(m.sealUpdate).not.toHaveBeenCalled();
    expect(m.galerieUpdate).not.toHaveBeenCalled();
    expect(m.notify).not.toHaveBeenCalled();
  });
});
