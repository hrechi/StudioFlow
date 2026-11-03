import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
  params: vi.fn(),
  admins: vi.fn(),
  client: vi.fn(),
  numero: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/modules/utilisateurs/notification.service", () => ({ createNotification: vi.fn() }));
vi.mock("@/modules/utilisateurs/utilisateur.service", () => ({ findUtilisateurById: mocks.client, listAdminRefs: mocks.admins }));
vi.mock("@/modules/facturation/facturation.integrations", () => ({ getFacturationReferences: vi.fn(), getFacturationSession: vi.fn() }));
vi.mock("@/modules/facturation/devis.model", () => ({
  Devis: {
    find: () => ({ sort: () => ({ lean: mocks.find }) }),
    findOne: () => ({ lean: mocks.findOne }),
    updateMany: vi.fn(),
    create: mocks.create,
  },
}));
vi.mock("@/modules/facturation/counter.model", () => ({
  Counter: { findOneAndUpdate: () => ({ lean: mocks.numero }) },
}));
vi.mock("../invitation.model", () => ({
  Invitation: {},
  ParametresInvitation: { findOne: () => ({ lean: mocks.params }) },
}));

import { assertDebloque, demanderDeblocage, getAccesInvitation } from "../invitation.acces";

const client = { id: "0123456789abcdef01234567", role: "CLIENT" as const };

const facture = (paye: number, declarations: { statut: string }[] = []) => ({
  montantTTC: 59500,
  montantPaye: paye,
  dateCompletePaiement: paye >= 59500 ? new Date("2026-11-01") : undefined,
  declarations,
});

const devis = (over: Record<string, unknown>) => ({
  _id: new Types.ObjectId(),
  numero: "DEV-2026-0001",
  statut: "ACCEPTE",
  montantTTC: 59500,
  dateValidite: new Date(Date.now() + 86_400_000),
  factures: [],
  ...over,
});

describe("invitation lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.mockResolvedValue(null);
    mocks.find.mockResolvedValue([]);
  });

  it("is locked with the default price when nothing was requested", async () => {
    await expect(getAccesInvitation(client.id)).resolves.toEqual({ etat: "VERROUILLE", prixTTC: 59.5 });
    await expect(assertDebloque(client)).rejects.toThrow(/locked/);
  });

  it.each([
    ["a quote still to accept", { statut: "ENVOYE" }, "DEVIS_A_ACCEPTER"],
    ["an accepted quote without invoice", { statut: "ACCEPTE", factures: [] }, "FACTURE_A_EMETTRE"],
    ["an unpaid invoice", { factures: [facture(0)] }, "FACTURE_A_PAYER"],
    ["a partly paid invoice", { factures: [facture(10000)] }, "FACTURE_A_PAYER"],
    ["a proof the admin has not confirmed", { factures: [facture(0, [{ statut: "EN_ATTENTE" }])] }, "PREUVE_EN_VERIFICATION"],
  ])("stays locked with %s", async (_nom, over, etat) => {
    mocks.find.mockResolvedValue([devis(over)]);
    expect((await getAccesInvitation(client.id)).etat).toBe(etat);
    await expect(assertDebloque(client)).rejects.toThrow(/locked/);
  });

  it("stays locked after a rejected proof", async () => {
    mocks.find.mockResolvedValue([devis({ factures: [facture(0, [{ statut: "REJETEE" }])] })]);
    expect((await getAccesInvitation(client.id)).etat).toBe("FACTURE_A_PAYER");
  });

  it("ignores declined and expired quotes", async () => {
    mocks.find.mockResolvedValue([devis({ statut: "REFUSE" }), devis({ statut: "EXPIRE" }), devis({ statut: "ENVOYE", dateValidite: new Date(0) })]);
    expect((await getAccesInvitation(client.id)).etat).toBe("VERROUILLE");
  });

  it("unlocks once the invoice is fully paid", async () => {
    mocks.find.mockResolvedValue([devis({ factures: [facture(59500)] })]);
    const acces = await getAccesInvitation(client.id);
    expect(acces.etat).toBe("DEBLOQUE");
    expect(acces.debloqueLe).toBe("2026-11-01T00:00:00.000Z");
    await expect(assertDebloque(client)).resolves.toBeUndefined();
  });

  it("refuses staff accounts", async () => {
    await expect(assertDebloque({ id: client.id, role: "ADMIN" })).rejects.toThrow(/client accounts/);
  });
});

describe("requesting the editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.mockResolvedValue({ prixHT: 80000, tva: 19 });
    mocks.find.mockResolvedValue([]);
    mocks.client.mockResolvedValue({ prenom: "Lina", nom: "Ben", email: "lina@example.test" });
    mocks.admins.mockResolvedValue([{ id: "fedcba9876543210fedcba98" }]);
    mocks.numero.mockResolvedValue({ value: 7 });
    mocks.create.mockImplementation(async (doc) => ({ ...doc, _id: new Types.ObjectId() }));
  });

  it("opens a sent quote at the admin's price, without deposit and addressed to an admin", async () => {
    await demanderDeblocage(client);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      objet: "INVITATION",
      statut: "ENVOYE",
      tauxAcompte: 0,
      montantHT: 80000,
      montantTVA: 15200,
      montantTTC: 95200,
      lignes: [{ quantite: 1, prixUnitaireHT: 80000 }],
    });
    expect(mocks.create.mock.calls[0][0].seance).toBeUndefined();
    expect(mocks.create.mock.calls[0][0].createdBy.toString()).toBe("fedcba9876543210fedcba98");
  });

  it("returns the quote in progress instead of opening a second one", async () => {
    const existant = devis({ statut: "ENVOYE" });
    mocks.find.mockResolvedValue([existant]);
    await expect(demanderDeblocage(client)).resolves.toEqual({ devisId: existant._id.toString() });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("never sells the editor twice", async () => {
    mocks.find.mockResolvedValue([devis({ factures: [facture(59500)] })]);
    await expect(demanderDeblocage(client)).rejects.toThrow(/already unlocked/);
  });

  it("uses the winning quote when two requests race", async () => {
    const gagnant = devis({ statut: "ENVOYE" });
    mocks.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    mocks.findOne.mockResolvedValue(gagnant);
    await expect(demanderDeblocage(client)).resolves.toEqual({ devisId: gagnant._id.toString() });
  });

  it("refuses staff", async () => {
    await expect(demanderDeblocage({ id: client.id, role: "ADMIN" })).rejects.toThrow(/client/);
  });
});
