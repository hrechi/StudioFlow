"use client";

import { useState } from "react";

export function PortfolioShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button type="button" onClick={() => void share()} className="rounded-full border border-current/20 px-4 py-2 text-sm hover:bg-current/10">{copied ? "Link copied" : "Share portfolio"}</button>;
}
