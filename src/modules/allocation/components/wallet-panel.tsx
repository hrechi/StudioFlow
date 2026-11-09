"use client";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Link2,
  Loader2,
  ServerOff,
  ShieldCheck,
  ShieldX,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getWalletLinkMessageAction, linkWalletAction } from "../allocation.actions";
import { chainName, type ChainConfig } from "../allocation.types";
import {
  chooseWallet,
  ensureChain,
  getConnectedAccount,
  getWalletChainId,
  hasMetaMask,
  onWalletChange,
  shortAddress,
  signMessage,
  walletErrorMessage,
} from "../blockchain.client";

/** What the server knows: the wallet linked to the account and its rights on the contract. */
export type WalletStatus = {
  address: string | null;
  owner: boolean;
  staff: boolean;
  chainReachable: boolean;
  /** The contract exists at the configured address (false: deploy it). Absent = assumed yes. */
  chainDeployed?: boolean;
};

type WalletState = {
  config: ChainConfig;
  status: WalletStatus;
  /** null while checking in the browser. */
  installed: boolean | null;
  account: string | null;
  rightChain: boolean;
  /** Connected account is the one linked to this StudioFlow account. */
  linked: boolean;
  /** Everything is in place to sign a transaction. */
  ready: boolean;
};

const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

export function WalletProvider({
  config,
  status,
  children,
}: {
  config: ChainConfig;
  status: WalletStatus;
  children: ReactNode;
}) {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [walletChain, setWalletChain] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const present = hasMetaMask();
    const [acc, chain] = present
      ? await Promise.all([getConnectedAccount(), getWalletChainId()])
      : [null, null];
    setInstalled(present);
    setAccount(acc);
    setWalletChain(chain);
  }, []);

  // MetaMask is an outside system: read it once after mount, then on each account/network change.
  useEffect(() => {
    const update = () => void refresh();
    const timer = setTimeout(update, 0);
    const unsubscribe = onWalletChange(update);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  const rightChain = walletChain === config.chainId;
  const linked = !!account && account.toLowerCase() === status.address;
  const value: WalletState = {
    config,
    status,
    installed,
    account,
    rightChain,
    linked,
    ready:
      !!installed &&
      !!account &&
      rightChain &&
      linked &&
      status.chainReachable &&
      status.chainDeployed !== false,
  };
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function Line({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Wallet;
  tone: "ok" | "warn" | "danger" | "muted";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm",
        tone === "ok" && "text-success-text",
        tone === "warn" && "text-warning-text",
        tone === "danger" && "text-destructive-text",
        tone === "muted" && "text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** MetaMask status + the one next step needed (install, connect, switch network, link). */
export function WalletPanel({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const { config, status, installed, account, rightChain, linked } = useWallet();
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (error) {
        toast.error(walletErrorMessage(error).message);
      }
    });

  const link = () =>
    run(async () => {
      const prepared = await getWalletLinkMessageAction();
      if (!prepared.ok) throw new Error(prepared.error);
      const signature = await signMessage(config, prepared.data.message);
      const result = await linkWalletAction({
        address: account,
        signature,
        issuedAt: prepared.data.issuedAt,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Wallet linked to your account");
      router.refresh();
    });

  let body: ReactNode;
  let action: ReactNode = null;
  if (installed === null) {
    body = (
      <Line icon={Loader2} tone="muted">
        Looking for MetaMask…
      </Line>
    );
  } else if (!installed) {
    body = (
      <Line icon={AlertTriangle} tone="danger">
        MetaMask is not installed. Install the{" "}
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          MetaMask extension
        </a>
        , then reload this page.
      </Line>
    );
  } else if (!account) {
    body = (
      <Line icon={Wallet} tone="muted">
        Connect MetaMask to allocate equipment.
      </Line>
    );
    action = (
      <Button disabled={isPending} onClick={() => run(async () => void (await chooseWallet()))}>
        <Wallet aria-hidden />
        Connect MetaMask
      </Button>
    );
  } else if (!rightChain) {
    body = (
      <Line icon={AlertTriangle} tone="warn">
        MetaMask is on another network. Switch to{" "}
        <strong>
          {chainName(config.chainId)} (chain {config.chainId})
        </strong>
        .
      </Line>
    );
    action = (
      <Button variant="outline" disabled={isPending} onClick={() => run(() => ensureChain(config))}>
        Switch network
      </Button>
    );
  } else if (!linked) {
    body = (
      <Line icon={Link2} tone="warn">
        {status.address
          ? `The site sees ${shortAddress(account)}, not the wallet linked to your StudioFlow account (${shortAddress(status.address)}). Choose that account, or link this one instead.`
          : `Link ${shortAddress(account)} to your StudioFlow account (a free signature, no transaction). Not the right account? Choose another one first.`}
      </Line>
    );
    action = (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => run(async () => void (await chooseWallet()))}
        >
          <Wallet aria-hidden />
          Choose account
        </Button>
        <Button disabled={isPending} onClick={link}>
          <Link2 aria-hidden />
          Link this wallet
        </Button>
      </div>
    );
  } else if (isAdmin && !status.owner) {
    body = (
      <Line icon={ShieldX} tone="warn">
        This wallet is not the contract owner: admin steps (confirm, return, register) will be
        refused. Link the wallet that deployed the contract (the studio admin&apos;s) instead.
      </Line>
    );
  } else if (!isAdmin && !status.staff) {
    body = (
      <Line icon={ShieldX} tone="warn">
        This wallet is not staff on the blockchain yet. Ask the admin to add it before booking.
      </Line>
    );
  } else {
    body = (
      <Line icon={CheckCircle2} tone="ok">
        Ready to sign on the blockchain.
      </Line>
    );
  }

  return (
    <Card className="gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#f6851b]/15 text-[#e2761b]">
            <Wallet className="size-4" aria-hidden />
          </span>
          <span className="font-semibold text-foreground">
            {account ? shortAddress(account) : "MetaMask"}
          </span>
          {account && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                rightChain ? "bg-success/10 text-success-text" : "bg-warning/10 text-warning-text",
              )}
            >
              {rightChain ? `${chainName(config.chainId)} · ${config.chainId}` : "Wrong network"}
            </span>
          )}
          {linked && status.owner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai-text">
              <Crown className="size-3" aria-hidden />
              Contract owner
            </span>
          )}
          {linked && status.staff && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary-text">
              <ShieldCheck className="size-3" aria-hidden />
              Staff
            </span>
          )}
        </div>
        {!status.chainReachable ? (
          <Line icon={ServerOff} tone="danger">
            The {chainName(config.chainId)} network can&apos;t be reached right now
            {config.chainId === 1337 ? (
              <>
                : start it with <code>npm run ganache</code> in the contracts folder.
              </>
            ) : (
              ". Try again in a moment."
            )}
          </Line>
        ) : status.chainDeployed === false ? (
          <Line icon={ServerOff} tone="danger">
            The allocation contract is not deployed on {chainName(config.chainId)}: run{" "}
            <code>npm run deploy:allocation</code> in the reframe-blockchain folder (see
            DEPLOYMENT.md).
          </Line>
        ) : (
          body
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Card>
  );
}
