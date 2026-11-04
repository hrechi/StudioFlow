"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

export type CardSourceData = {
  slug: string;
  coverUrl: string;
  title: string;
  photographerName: string;
  location?: string;
  speciality?: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

export type TransitionStage = "idle" | "lift" | "expand" | "revealing" | "complete";

type PortfolioTransitionContextType = {
  isTransitioning: boolean;
  stage: TransitionStage;
  sourceData: CardSourceData | null;
  startTransition: (data: CardSourceData) => void;
  markPageRevealed: () => void;
};

const PortfolioTransitionContext = createContext<PortfolioTransitionContextType>({
  isTransitioning: false,
  stage: "idle",
  sourceData: null,
  startTransition: () => {},
  markPageRevealed: () => {},
});

export const usePortfolioTransition = () => useContext(PortfolioTransitionContext);

export function PortfolioTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [stage, setStage] = useState<TransitionStage>("idle");
  const [sourceData, setSourceData] = useState<CardSourceData | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const startTransition = useCallback(
    (data: CardSourceData) => {
      // Check prefers-reduced-motion
      if (typeof window !== "undefined") {
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (motionQuery.matches) {
          router.push(`/portfolio/${data.slug}`);
          return;
        }
      }

      clearTimers();
      setSourceData(data);
      setStage("lift");

      // Mark in sessionStorage so destination page knows it arrived from cinematic transition
      try {
        sessionStorage.setItem(
          "studioflow_cinematic_transition",
          JSON.stringify({
            slug: data.slug,
            timestamp: Date.now(),
          }),
        );
      } catch {
        // storage might be restricted
      }

      // Pre-fetch destination page immediately
      router.prefetch(`/portfolio/${data.slug}`);

      // Step 1: Card lifts and tilts in 3D (0ms -> 250ms)
      // Step 2: Card glides towards center and expands to full viewport (250ms)
      const t1 = setTimeout(() => {
        setStage("expand");
      }, 250);

      // Step 3: Trigger navigation while expansion covers screen (450ms)
      const t2 = setTimeout(() => {
        router.push(`/portfolio/${data.slug}`);
      }, 480);

      // Step 4: Reveal and dissolve into destination page (850ms)
      const t3 = setTimeout(() => {
        setStage("revealing");
      }, 850);

      // Step 5: Clean up after full transition completes (1200ms)
      const t4 = setTimeout(() => {
        setStage("complete");
        setSourceData(null);
        setStage("idle");
      }, 1250);

      timersRef.current = [t1, t2, t3, t4];
    },
    [router, clearTimers],
  );

  const markPageRevealed = useCallback(() => {
    // Called by destination page once mounted
    setStage("revealing");
    const t = setTimeout(() => {
      setStage("complete");
      setSourceData(null);
      setStage("idle");
    }, 400);
    timersRef.current.push(t);
  }, []);

  return (
    <PortfolioTransitionContext.Provider
      value={{
        isTransitioning: stage !== "idle" && stage !== "complete",
        stage,
        sourceData,
        startTransition,
        markPageRevealed,
      }}
    >
      {children}
    </PortfolioTransitionContext.Provider>
  );
}

