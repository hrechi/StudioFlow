"use client";

import { useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import type { ElementPortfolioPublic } from "../portfolio.types";

export function BeforeAfterSlider({ avant, apres }: { avant: ElementPortfolioPublic; apres: ElementPortfolioPublic }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <SafeImage src={avant.media.url} alt={avant.texteAlt || avant.legende || "Before editing"} fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
          <SafeImage src={apres.media.url} alt={apres.texteAlt || apres.legende || "After editing"} fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Before</span>
        <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">After</span>
      </div>
      <label className="sr-only">Compare before and after</label>
      <input type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="w-full accent-primary" aria-label="Before and after comparison" />
    </div>
  );
}
