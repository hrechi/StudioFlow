"use client";

import React from "react";
import { usePortfolioTransition } from "./PortfolioTransitionContext";
import { SafeImage } from "@/components/shared/safe-image";

export function PortfolioTransitionOverlay() {
  const { stage, sourceData } = usePortfolioTransition();

  if (!sourceData || stage === "idle") {
    return null;
  }

  const { rect, coverUrl, title, photographerName, location, speciality } = sourceData;

  // Determine styles for the 3D proxy card based on current stage
  const isExpandingOrLater = stage === "expand" || stage === "revealing" || stage === "complete";
  const isRevealing = stage === "revealing" || stage === "complete";

  const cardStyle: React.CSSProperties = isExpandingOrLater
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
        transform: "translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg)",
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        transition: "all 620ms cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : {
        position: "fixed",
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: "16px",
        transform: "translate3d(0, -12px, 60px) scale(1.045) rotateX(2.5deg) rotateY(-4deg)",
        boxShadow:
          "0 35px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(232, 163, 74, 0.22)",
        transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms ease-out",
      };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none"
      style={{
        perspective: "1400px",
        transformStyle: "preserve-3d",
        perspectiveOrigin: "50% 50%",
      }}
    >
      {/* 1. Cinematic Darkening Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: isRevealing ? 0 : 1,
          background:
            "radial-gradient(circle at 50% 45%, rgba(20, 8, 6, 0.94) 0%, rgba(8, 3, 2, 0.99) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      {/* 2. Floating 3D Proxy Card */}
      <div
        className="overflow-hidden bg-[#0c0807] border border-white/15"
        style={{
          ...cardStyle,
          opacity: isRevealing ? 0 : 1,
          transition: isRevealing
            ? "opacity 380ms ease-out, all 620ms cubic-bezier(0.16, 1, 0.3, 1)"
            : cardStyle.transition,
        }}
      >
        {/* Full Image Representation */}
        <div className="relative size-full overflow-hidden bg-black">
          <SafeImage
            src={coverUrl}
            alt={title}
            fill
            unoptimized
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out"
            style={{
              transform: isExpandingOrLater ? "scale(1.02)" : "scale(1.06)",
            }}
          />

          {/* Luxury ambient vignette overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(to top, rgba(10, 4, 3, 0.85) 0%, rgba(10, 4, 3, 0.3) 50%, rgba(10, 4, 3, 0.6) 100%)",
              opacity: isExpandingOrLater ? 0.45 : 0.7,
            }}
          />

          {/* Cinematic Title & Photographer Badge (smoothly fades out as full-screen locks in) */}
          <div
            className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col justify-end transition-all duration-400"
            style={{
              opacity: isExpandingOrLater ? 0 : 1,
              transform: isExpandingOrLater ? "translateY(16px)" : "translateY(0)",
            }}
          >
            {speciality && (
              <span className="mb-2 font-mono text-[10px] tracking-[0.25em] text-[#e8a34a] uppercase">
                {speciality}
              </span>
            )}
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white tracking-tight drop-shadow-md">
              {title}
            </h2>
            <div className="mt-1 flex items-center gap-2 font-sans text-xs text-white/70">
              <span>{photographerName}</span>
              {location && <span>· {location}</span>}
            </div>
          </div>

          {/* Delicate Amber Accent Line */}
          <div
            className="absolute top-0 inset-x-0 h-[2px] transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #e8a34a 50%, transparent 100%)",
              opacity: isExpandingOrLater ? 0 : 0.8,
            }}
          />
        </div>
      </div>
    </div>
  );
}

