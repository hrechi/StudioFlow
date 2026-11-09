"use client";

import { Loader2, RefreshCw, Unlink, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { linkWalletAction, unlinkWalletAction } from "../snapseal.wallet-actions";
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
  const [pending, setPending] = useState<"link" | "unlink" | null>(null);

  const unlink = async () => {
    setPending("unlink");
    try {
      const result = await unlinkWalletAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Wallet unlinked from your account");
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  const link = async () => {
    const wallet = (window as unknown as { ethereum?: Injected }).ethereum;
    if (!wallet) {
      toast.error("MetaMask was not found in this browser.");
      return;
    }
    setPending("link");
    try {
      // MetaMask's account picker: switching account inside MetaMask doesn't change the account
      // a site already sees, so the user chooses here which one to link.
      try {
        await wallet.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
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
        description: result.data.movedFromAnotherAccount
          ? `${shortAddress(result.data.address)} — it was removed from the other account it was linked to.`
          : shortAddress(result.data.address),
      });
      router.refresh();
    } catch (error) {
      const e = error as { code?: number; message?: string };
      toast.error(e.code === 4001 ? "Cancelled in MetaMask." : (e.message ?? "Linking failed."));
    } finally {
      setPending(null);
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
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            {linkedAddress ? (
              <>
                Linked: <code className="text-xs break-all">{linkedAddress}</code>
              </>
            ) : (
              <span className="text-muted-foreground">No wallet linked yet.</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {linkedAddress && (
              <Button variant="ghost" onClick={unlink} disabled={pending !== null}>
                {pending === "unlink" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Unlink aria-hidden />
                )}
                Unlink
              </Button>
            )}
            <Button
              variant={linkedAddress ? "outline" : "default"}
              onClick={link}
              disabled={pending !== null}
            >
              {pending === "link" ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : linkedAddress ? (
                <RefreshCw aria-hidden />
              ) : (
                <Wallet aria-hidden />
              )}
              {linkedAddress ? "Change wallet" : "Link my MetaMask wallet"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          MetaMask asks which account to use. A wallet belongs to one ReFrame account: linking one
          that another account had moves it here, and that account is left without a wallet.
        </p>
      </CardContent>
    </Card>
  );
}
