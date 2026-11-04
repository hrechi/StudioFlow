"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioTransition } from "./PortfolioTransitionContext";

type PortfolioPageRevealProps = {
  slug: string;
  children: React.ReactNode;
};

export function PortfolioPageReveal({ slug, children }: PortfolioPageRevealProps) {
  const { markPageRevealed } = usePortfolioTransition();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Check if we arrived via cinematic card click
    let hadCinematicOrigin = false;

    try {
      const stored = sessionStorage.getItem("studioflow_cinematic_transition");
      if (stored) {
        const parsed = JSON.parse(stored) as { slug?: string; timestamp?: number };
        if (parsed.slug === slug && Date.now() - (parsed.timestamp || 0) < 3500) {
          hadCinematicOrigin = true;
        }
        sessionStorage.removeItem("studioflow_cinematic_transition");
      }
    } catch {
      // storage might not be accessible
    }

    if (hadCinematicOrigin) {
      setShouldAnimate(true);
      markPageRevealed();

      // Start reveal animation frame
      const animTimer = setTimeout(() => {
        setIsRevealed(true);
      }, 30);

      // Complete transition and return to completely neutral interactive state
      const completeTimer = setTimeout(() => {
        setShouldAnimate(false);
      }, 700);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [slug, markPageRevealed]);

  if (!shouldAnimate) {
    return <>{children}</>;
  }

  return (
    <div
      className="portfolio-cinematic-page-reveal w-full will-change-transform"
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed
          ? "scale3d(1, 1, 1) translate3d(0, 0, 0)"
          : "scale3d(0.985, 0.985, 1) translate3d(0, 12px, 0)",
        transition:
          "opacity 580ms cubic-bezier(0.16, 1, 0.3, 1), transform 580ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}

