"use client";

import type { JsonRpcSigner } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  connectWallet,
  explainChainError,
  getInjectedWallet,
  readChainState,
  readOnlyProvider,
  type ChainState,
} from "../snapseal.chain";
import type { SnapSealConfig } from "../snapseal.types";

/** Wallet connection, on-chain state of the gallery, and "run a transaction" for both panels. */
export function useSnapSeal(config: SnapSealConfig, onChainId: number | null) {
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

  // Switching MetaMask account (photographer / client) or network drops the old signer.
  useEffect(() => {
    const wallet = getInjectedWallet();
    if (!wallet?.on) return;
    const reset = () => {
      setSigner(null);
      setAddress(null);
    };
    wallet.on("accountsChanged", reset);
    wallet.on("chainChanged", reset);
    return () => {
      wallet.removeListener?.("accountsChanged", reset);
      wallet.removeListener?.("chainChanged", reset);
    };
  }, []);

  const connect = useCallback(
    async (pick = false) => {
      const wallet = getInjectedWallet();
      if (!wallet) {
        toast.error("MetaMask was not found in this browser.");
        return;
      }
      try {
        const nextSigner = await connectWallet(wallet, config, pick);
        setSigner(nextSigner);
        setAddress(await nextSigner.getAddress());
      } catch (error) {
        toast.error(explainChainError(error));
      }
    },
    [config],
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
