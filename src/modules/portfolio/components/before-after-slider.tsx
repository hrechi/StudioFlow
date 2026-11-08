"use client";

import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import type { ElementPortfolioPublic } from "../portfolio.types";

export function BeforeAfterSlider({
  avant,
  apres,
}: {
  avant: ElementPortfolioPublic;
  apres: ElementPortfolioPublic;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[4/3] w-full select-none overflow-hidden rounded-xl bg-muted shadow-lg"
      onPointerDown={(e) => {
        updatePosition(e.clientX);
      }}
    >
      {/* Before Image (Base underneath) */}
      <SafeImage
        src={avant.media.url}
        alt={avant.texteAlt || avant.legende || "Before editing"}
        fill
        unoptimized
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="pointer-events-none object-cover"
      />

      {/* After Image (Clipped overlay) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <SafeImage
          src={apres.media.url}
          alt={apres.texteAlt || apres.legende || "After editing"}
          fill
          unoptimized
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="pointer-events-none object-cover"
        />
      </div>

      {/* Floating Badges inside the photo */}
      <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-black/60 px-3 py-1 font-mono text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
        Before
      </span>
      <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/60 px-3 py-1 font-mono text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
        After
      </span>

      {/* Vertical divider line & handle inside the photo */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.7)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/75 text-white shadow-xl backdrop-blur-md transition-transform duration-150 group-hover:scale-110">
          <MoveHorizontal className="size-4" aria-hidden="true" />
        </div>
      </div>

      {/* Accessible slide input embedded directly on the photo (not under the photo) */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-label="Compare before and after editing"
        className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
