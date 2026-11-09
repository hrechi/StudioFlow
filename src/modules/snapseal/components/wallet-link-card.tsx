"use client";

import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { linkWalletAction } from "../snapseal.wallet-actions";
import { toHexMessage, walletLinkMessage } from "../snapseal.wallet";

type Injected = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Profile card: proves which MetaMask wallet belongs to this account, by a free signature
 * (no transaction). SnapSeal then uses it instead of a pasted address.
 */
export function WalletLinkCard({
  userId,
  linkedAddress,
  role,
}: {
  userId: string;
  linkedAddress: string | null;
  role: "CLIENT" | "STAFF";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const link = async () => {
    const wallet = (window as unknown as { ethereum?: Injected }).ethereum;
    if (!wallet) {
      toast.error("MetaMask was not found in this browser.");
      return;
    }
    setPending(true);
    try {
      // MetaMask's account picker: switching account inside MetaMask doesn't change the account
      // a site already sees, so the user chooses here which one to link.
      try {
        await wallet.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      } catch (error) {
        if ((error as { code?: number }).code !== -32601) throw error; // no picker: usual request
      }
      const [address] = (await wallet.request({ method: "eth_requestAccounts" })) as string[];
      const issuedAt = new Date().toISOString();
      const signature = (await wallet.request({
        method: "personal_sign",
        params: [toHexMessage(walletLinkMessage(userId, issuedAt)), address],
      })) as string;
      const result = await linkWalletAction({ address, signature, issuedAt });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Wallet linked to your account", {
        description: shortAddress(result.data.address),
      });
      router.refresh();
    } catch (error) {
      const e = error as { code?: number; message?: string };
      toast.error(e.code === 4001 ? "Cancelled in MetaMask." : (e.message ?? "Linking failed."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card data-tour="wallet-link">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" aria-hidden />
          Blockchain wallet
        </CardTitle>
        <CardDescription>
          {role === "CLIENT"
            ? "Galleries with a blockchain proof are sealed for this wallet: you validate your selection and confirm the reception with it."
            : "The wallet you sign gallery seals and deliveries with."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {linkedAddress ? (
            <>
              Linked: <code className="text-xs">{linkedAddress}</code>
            </>
          ) : (
            <span className="text-muted-foreground">No wallet linked yet.</span>
          )}
        </p>
        <Button variant={linkedAddress ? "outline" : "default"} onClick={link} disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {linkedAddress ? "Link another wallet" : "Link my MetaMask wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}
