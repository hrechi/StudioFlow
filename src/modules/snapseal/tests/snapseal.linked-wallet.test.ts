import { describe, expect, it, vi } from "vitest";
import { connectWallet, reconnectLinkedWallet, type InjectedWallet } from "../snapseal.chain";
import type { SnapSealConfig } from "../snapseal.types";

/**
 * The proof page connects by itself to the wallet linked in the profile, without a popup, when
 * MetaMask already allows it for the site, even if another account is selected in MetaMask.
 */

const ADMIN = "0xfd22871d994d67f446cd47ac2471118fb383713c";
const OTHER = "0x0ef7e12438d01b2cf3b6895c9753011dabbb8e35";
const config = { chainId: 11155111, networkName: "Sepolia", rpcUrl: "http://x", explorerUrl: null } as unknown as SnapSealConfig;

/** A fake MetaMask: the accounts this site may use (selected one first) and its network. */
function metaMask(allowed: string[], chainId = 11155111) {
  const calls: string[] = [];
  const wallet = {
    request: vi.fn(async ({ method }: { method: string }) => {
      calls.push(method);
      if (method === "eth_accounts" || method === "eth_requestAccounts") return allowed;
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "wallet_switchEthereumChain" || method === "wallet_requestPermissions") return null;
      throw Object.assign(new Error(`unsupported ${method}`), { code: -32601 });
    }),
  } as unknown as InjectedWallet;
  return { wallet, calls };
}

describe("reconnectLinkedWallet (no popup)", () => {
  it("connects to the linked wallet when the site may use it, even if another account is selected", async () => {
    const { wallet, calls } = metaMask([OTHER, ADMIN]);
    const signer = await reconnectLinkedWallet(wallet, config, ADMIN);
    expect((await signer!.getAddress()).toLowerCase()).toBe(ADMIN);
    expect(calls).not.toContain("eth_requestAccounts"); // never opens MetaMask
    expect(calls).not.toContain("wallet_requestPermissions");
  });

  it("waits for a click when MetaMask doesn't allow the linked wallet for this site yet", async () => {
    const { wallet } = metaMask([OTHER]);
    expect(await reconnectLinkedWallet(wallet, config, ADMIN)).toBeNull();
  });

  it("waits for a click when MetaMask is on another network", async () => {
    const { wallet } = metaMask([ADMIN], 1);
    expect(await reconnectLinkedWallet(wallet, config, ADMIN)).toBeNull();
  });

  it("matches addresses whatever their letter case", async () => {
    const { wallet } = metaMask(["0xFD22871D994D67F446CD47AC2471118FB383713C"]);
    expect(await reconnectLinkedWallet(wallet, config, ADMIN)).not.toBeNull();
  });
});

describe("connectWallet (the Connect button)", () => {
  it("uses the linked wallet when it is allowed, not just MetaMask's selected account", async () => {
    const { wallet } = metaMask([OTHER, ADMIN]);
    const signer = await connectWallet(wallet, config, false, ADMIN);
    expect((await signer.getAddress()).toLowerCase()).toBe(ADMIN);
  });

  it("falls back to MetaMask's selected account when the linked one isn't allowed", async () => {
    const { wallet } = metaMask([OTHER]);
    const signer = await connectWallet(wallet, config, false, ADMIN);
    expect((await signer.getAddress()).toLowerCase()).toBe(OTHER);
  });

  it("'Choose account' opens MetaMask's account picker", async () => {
    const { wallet, calls } = metaMask([OTHER]);
    await connectWallet(wallet, config, true);
    expect(calls).toContain("wallet_requestPermissions");
  });
});
