/**
 * The message a user signs to link a wallet to their account. Shared by the browser (which asks
 * MetaMask to sign it) and the server (which rebuilds it from the SESSION's user id, so a
 * signature made for another account never matches). No ethers here: profile pages stay light.
 */

export const WALLET_LINK_MAX_AGE_MS = 5 * 60 * 1000;

export function walletLinkMessage(userId: string, issuedAt: string): string {
  return [
    "ReFrame: link this wallet to my account",
    "",
    `Account: ${userId}`,
    `Time: ${issuedAt}`,
    "",
    "Signing is free and sends no transaction.",
  ].join("\n");
}

/** UTF-8 → 0x-hex, the form MetaMask's personal_sign expects. */
export function toHexMessage(message: string): string {
  return `0x${Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
