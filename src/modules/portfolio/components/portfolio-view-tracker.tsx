"use client";

import { useEffect, useRef } from "react";

export function PortfolioViewTracker({ slug }: { slug: string }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void fetch(`/api/portfolio/${encodeURIComponent(slug)}/vue`, { method: "POST" });
  }, [slug]);
  return null;
}
