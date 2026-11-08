"use client";

/**
 * Signs the client's selection on-chain. Loaded with import() only when a client of a
 * proof-required gallery clicks "Approve my selection": normal galleries never load ethers.
 */
import {
  connectWallet,
  explainChainError,
  getInjectedWallet,
  registryContract,
  sameAddress,
  shorten,
} from "../snapseal.chain";
import type { SnapSealConfig } from "../snapseal.types";

export class WrongWalletError extends Error {}

export async function signSelection({
  config,
  onChainId,
  expectedWallet,
  hashes,
}: {
  config: SnapSealConfig;
  onChainId: number;
  expectedWallet?: string;
  hashes: string[];
}): Promise<void> {
  const wallet = getInjectedWallet();
  if (!wallet) throw new Error("MetaMask was not found in this browser.");
  const signer = await connectWallet(wallet, config);
  const address = await signer.getAddress();
  // Warn before signing: the contract would refuse any other wallet anyway.
  if (expectedWallet && !sameAddress(address, expectedWallet)) {
    throw new WrongWalletError(
      `This gallery is sealed for the wallet ${shorten(expectedWallet)}, but MetaMask is on ${shorten(address)}. Switch account in MetaMask, then approve again.`,
    );
  }
  // Two photos with identical bytes share one fingerprint, and the contract refuses duplicates.
  const unique = [...new Set(hashes.map((h) => h.toLowerCase()))];
  const tx = await registryContract(config, signer).submitSelection(onChainId, unique);
  await tx.wait();
}

export function explainSelectionError(error: unknown): string {
  return error instanceof WrongWalletError ? error.message : explainChainError(error);
}
