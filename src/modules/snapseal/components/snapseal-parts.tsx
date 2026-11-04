"use client";

import { Check, Circle, TriangleAlert, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sameAddress, shorten, type ChainState } from "../snapseal.chain";

function formatChainDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

export function WalletCard({
  address,
  expected,
  expectedLabel,
  networkName,
  onConnect,
}: {
  address: string | null;
  expected?: string;
  expectedLabel: string;
  networkName: string;
  onConnect: () => void;
}) {
  const wrongWallet = !!address && !!expected && !sameAddress(address, expected);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="size-4 text-primary" aria-hidden />
          {address ? (
            <span>
              Connected on {networkName}: <code className="text-xs">{shorten(address)}</code>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Connect MetaMask to sign on the blockchain.
            </span>
          )}
        </div>
        {!address && <Button onClick={onConnect}>Connect MetaMask</Button>}
        {wrongWallet && expected && (
          <p className="flex w-full items-center gap-2 text-sm text-destructive-text">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            This gallery expects the {expectedLabel} wallet {shorten(expected)}. Switch account in
            MetaMask, or the contract will refuse.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SealTimeline({ chain }: { chain: ChainState | null }) {
  const steps = [
    { label: "Gallery created", at: chain?.createdAt ?? 0 },
    { label: "Selection validated", at: chain?.selectedAt ?? 0 },
    { label: "Delivery published", at: chain?.deliveredAt ?? 0 },
    { label: "Reception confirmed", at: chain?.confirmedAt ?? 0 },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>On-chain tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {step.at ? (
                  <Check className="size-4 text-success-text" aria-hidden />
                ) : (
                  <Circle className="size-4 text-muted-foreground" aria-hidden />
                )}
                <span className={cn(!step.at && "text-muted-foreground")}>{step.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {step.at ? formatChainDate(step.at) : "Pending"}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function SealSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function ExplorerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-primary-text hover:underline"
    >
      {children}
    </a>
  );
}

export function SnapSealNotConfigured() {
  return (
    <Card>
      <CardContent className="text-sm text-muted-foreground">
        SnapSeal is not active yet: the contract addresses are missing from the server settings
        (SNAPSEAL_REGISTRY_ADDRESS and SNAPSEAL_DELIVERY_ADDRESS).
      </CardContent>
    </Card>
  );
}
