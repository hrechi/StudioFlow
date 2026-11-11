"use client";

import type { JsonRpcSigner } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  connectWallet,
  explainChainError,
  getInjectedWallet,
  readChainState,
  reconnectLinkedWallet,
  readOnlyProvider,
  type ChainState,
} from "../snapseal.chain";
import type { SnapSealConfig } from "../snapseal.types";

/** Wallet connection, on-chain state of the gallery, and "run a transaction" for both panels. */
export function useSnapSeal(
  config: SnapSealConfig,
  onChainId: number | null,
  /** The wallet linked in the signed-in account's profile: connected automatically. */
  linkedWallet?: string | null,
) {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<ChainState | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fallbackProvider = useMemo(() => readOnlyProvider(config), [config]);

  const refresh = useCallback(async () => {
    if (onChainId === null) return;
    try {
      // Right after a transaction, the wallet's own node is the first to know about it.
      const provider = signer?.provider ?? fallbackProvider;
      setChain(await readChainState(config, provider, onChainId));
      setChainError(null);
    } catch (error) {
      setChainError(explainChainError(error));
    }
  }, [config, fallbackProvider, onChainId, signer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads external chain data
    void refresh();
  }, [refresh]);

  // The profile's linked wallet is connected by itself (no popup) whenever MetaMask already
  // allows it for this site: on arrival, and again after any account or network change.
  // Otherwise the old signer is dropped and "Connect MetaMask" is shown.
  useEffect(() => {
    const wallet = getInjectedWallet();
    if (!wallet) return;
    let active = true;
    const sync = async () => {
      let next: JsonRpcSigner | null = null;
      try {
        next = linkedWallet ? await reconnectLinkedWallet(wallet, config, linkedWallet) : null;
      } catch {
        next = null;
      }
      if (!active) return;
      setSigner(next);
      setAddress(next ? await next.getAddress() : null);
    };
    void sync();
    if (!wallet.on) return;
    wallet.on("accountsChanged", sync);
    wallet.on("chainChanged", sync);
    return () => {
      active = false;
      wallet.removeListener?.("accountsChanged", sync);
      wallet.removeListener?.("chainChanged", sync);
    };
  }, [config, linkedWallet]);

  const connect = useCallback(
    async (pick = false) => {
      const wallet = getInjectedWallet();
      if (!wallet) {
        toast.error("MetaMask was not found in this browser.");
        return;
      }
      try {
        const nextSigner = await connectWallet(wallet, config, pick, pick ? null : linkedWallet);
        setSigner(nextSigner);
        setAddress(await nextSigner.getAddress());
      } catch (error) {
        toast.error(explainChainError(error));
      }
    },
    [config, linkedWallet],
  );

  /** Runs one step with the busy state, the error toast and a re-read of the chain. */
  const run = useCallback(
    async (successMessage: string, step: (signer: JsonRpcSigner) => Promise<void>) => {
      if (!signer) {
        toast.error("Connect your wallet first.");
        return;
      }
      setBusy(true);
      try {
        await step(signer);
        toast.success(successMessage);
        await refresh();
      } catch (error) {
        toast.error(explainChainError(error));
      } finally {
        setBusy(false);
      }
    },
    [refresh, signer],
  );

  return { signer, address, chain, chainError, busy, connect, refresh, run };
}
