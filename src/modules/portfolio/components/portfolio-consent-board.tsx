"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SafeImage } from "@/components/shared/safe-image";
import { repondreConsentement } from "../portfolio.actions";
import type { PendingPortfolioConsent } from "../portfolio.service";

export function PortfolioConsentBoard({ requests }: { requests: PendingPortfolioConsent[] }) {
  const [items, setItems] = useState(requests);
  const router = useRouter();
  async function answer(elementId: string, accord: boolean) {
    const result = await repondreConsentement({ elementId, accord });
    if (!result.ok) { toast.error(result.error); return; }
    setItems((current) => current.flatMap((item) => {
      if (item.elementId !== elementId) return [item];
      return accord ? [{ ...item, statut: "ACCORDE" as const }] : [];
    }));
    toast.success(accord ? "Consent recorded." : "Consent declined or withdrawn. The photo was removed from any published page.");
    router.refresh();
  }
  if (!items.length) return <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">You have no pending portfolio photo requests.</div>;
  return <ul className="grid gap-4 md:grid-cols-2">{items.map((item) => <li key={item.elementId} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="relative aspect-[4/3] bg-muted"><SafeImage src={item.miniature} alt={item.legende || "Photo awaiting consent"} fill unoptimized sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /></div><div className="p-5"><h2 className="font-semibold">{item.statut === "ACCORDE" ? "You allowed this photo to appear" : `${item.photographe} wants to include this photo`}</h2><p className="mt-1 text-sm text-muted-foreground">Portfolio: {item.titrePortfolio}</p>{item.legende && <p className="mt-3 text-sm">{item.legende}</p>}<div className="mt-5 flex gap-2">{item.statut === "EN_ATTENTE" ? <><button type="button" onClick={() => void answer(item.elementId, true)} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Allow</button><button type="button" onClick={() => void answer(item.elementId, false)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold">Decline</button></> : <button type="button" onClick={() => void answer(item.elementId, false)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold">Withdraw consent</button>}</div></div></li>)}</ul>;
}
