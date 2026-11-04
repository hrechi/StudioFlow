"use client";

import { useEffect, useRef, type RefObject } from "react";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function useWalkGallery(
  rootRef: RefObject<HTMLElement | null>,
  workCount: number,
  onIndexChange: (index: number) => void,
) {
  const callbackRef = useRef(onIndexChange);
  useEffect(() => {
    callbackRef.current = onIndexChange;
  }, [onIndexChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || workCount === 0) return;

    const works = Array.from(root.querySelectorAll<HTMLElement>("[data-walk-work]"));
    let raf = 0;
    let lastIndex = -1;

    const paint = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom < -viewportHeight * 2 || rect.top > viewportHeight * 2.2) return;

      const runway = Math.max(1, root.offsetHeight - viewportHeight);
      const p = clamp01(-rect.top / runway);
      root.style.setProperty("--p", p.toFixed(4));
      root.style.setProperty("--intro", clamp01(1 - p * 4).toFixed(3));

      const spacing = window.innerWidth < 700 ? 820 : 1220;
      const lead = 0.55;
      const camera = -lead + p * (workCount - 1 + lead);

      works.forEach((work, index) => {
        const z = (camera - index) * spacing;
        const lit = clamp01(1 - Math.abs(z) / (spacing * 0.85));
        const opacity = z < 200 ? 1 : clamp01(1 - (z - 200) / 380);
        work.style.setProperty("--z", `${z.toFixed(1)}px`);
        work.style.setProperty("--lit", lit.toFixed(3));
        work.style.setProperty("--op", opacity.toFixed(3));
        work.style.visibility = opacity <= 0.004 ? "hidden" : "visible";
      });

      const index = Math.max(0, Math.min(workCount - 1, Math.round(camera)));
      if (index !== lastIndex) {
        lastIndex = index;
        callbackRef.current(index);
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef, workCount]);
}
