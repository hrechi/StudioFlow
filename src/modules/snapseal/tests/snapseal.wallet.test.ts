import { Wallet } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Phase 2: linking a wallet needs a fresh signature, by that wallet, for THIS account. */

const m = vi.hoisted(() => ({
  user: { id: "65f000000000000000000001" },
  current: vi.fn(),
  save: vi.fn(),
  owner: vi.fn(),
  unset: vi.fn(),
  allow: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireUser: async () => m.user }));
vi.mock("@/modules/utilisateurs/utilisateur.service", () => ({
  getUtilisateurWallet: m.current,
  setUtilisateurWallet: m.save,
  findWalletOwner: m.owner,
  unsetUtilisateurWallet: m.unset,
}));
vi.mock("../snapseal.guards", () => ({ assertWalletChangeAllowed: m.allow }));

const { linkWalletAction, unlinkWalletAction } = await import("../snapseal.wallet-actions");
const { walletLinkMessage } = await import("../snapseal.wallet");
const { ServiceError } = await import("@/lib/action-result");

// Public Ganache test keys (accounts 1 and 2 of `npm run ganache`): never real funds.
const client = new Wallet("0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1");
const other = new Wallet("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c");

async function signed(wallet: Wallet, userId = m.user.id, issuedAt = new Date().toISOString()) {
  return {
    address: client.address,
    signature: await wallet.signMessage(walletLinkMessage(userId, issuedAt)),
    issuedAt,
  };
}

describe("linkWalletAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.current.mockResolvedValue(null);
    m.allow.mockResolvedValue(undefined);
    m.save.mockResolvedValue({ movedFromAnotherAccount: false });
    m.owner.mockResolvedValue(null);
    m.unset.mockResolvedValue(undefined);
  });

  it("links the wallet that signed a fresh message for this account", async () => {
    const result = await linkWalletAction(await signed(client));
    expect(result.ok).toBe(true);
    expect(m.save).toHaveBeenCalledWith(m.user.id, client.address);
  });

  it("refuses a signature made by another wallet", async () => {
    const result = await linkWalletAction(await signed(other));
    expect(result).toMatchObject({ ok: false, error: "This signature was not made by this wallet." });
    expect(m.save).not.toHaveBeenCalled();
  });

  it("refuses a signature older than 5 minutes", async () => {
    const old = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const result = await linkWalletAction(await signed(client, m.user.id, old));
    expect(result.ok).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
  });

  it("refuses a signature made for another account (the server rebuilds the message)", async () => {
    const result = await linkWalletAction(await signed(client, "65f0000000000000000000ff"));
    expect(result.ok).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
  });

  it("moves a wallet linked to another account here (the signature proves it is this user's)", async () => {
    const previous = "65f000000000000000000002";
    m.owner.mockResolvedValue(previous);
    m.save.mockResolvedValue({ movedFromAnotherAccount: true });
    const result = await linkWalletAction(await signed(client));
    expect(result).toMatchObject({ ok: true, data: { movedFromAnotherAccount: true } });
    // The other account is checked first: it may still need the wallet for an unfinished seal.
    expect(m.allow).toHaveBeenCalledWith(previous, client.address, "", true);
    expect(m.save).toHaveBeenCalledWith(m.user.id, client.address);
  });

  it("keeps a wallet the other account still needs for an unfinished seal", async () => {
    m.owner.mockResolvedValue("65f000000000000000000002");
    m.allow.mockImplementation(async (_id: string, _cur: string, _next: string, other?: boolean) => {
      if (other) throw new ServiceError("This wallet is used by another account for a sealed gallery.");
    });
    const result = await linkWalletAction(await signed(client));
    expect(result.ok).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
  });

  it("unlinks the account's wallet", async () => {
    m.current.mockResolvedValue(client.address.toLowerCase());
    const result = await unlinkWalletAction();
    expect(result.ok).toBe(true);
    expect(m.unset).toHaveBeenCalledWith(m.user.id);
  });

  it("does not unlink while a sealed gallery still needs the wallet", async () => {
    m.current.mockResolvedValue(client.address.toLowerCase());
    m.allow.mockRejectedValue(new ServiceError("Keep this wallet until you confirm the reception."));
    const result = await unlinkWalletAction();
    expect(result.ok).toBe(false);
    expect(m.unset).not.toHaveBeenCalled();
  });

  it("refuses a change while a sealed gallery is not finished", async () => {
    m.current.mockResolvedValue(other.address.toLowerCase());
    m.allow.mockRejectedValue(new ServiceError("Keep this wallet until you confirm the reception."));
    const result = await linkWalletAction(await signed(client));
    expect(result.ok).toBe(false);
    expect(m.save).not.toHaveBeenCalled();
  });
});
