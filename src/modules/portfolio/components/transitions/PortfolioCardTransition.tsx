"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { usePortfolioTransition } from "./PortfolioTransitionContext";

type PortfolioCardTransitionProps = {
  slug: string;
  coverUrl: string;
  title: string;
  photographerName: string;
  location?: string;
  speciality?: string;
  children: React.ReactNode;
  className?: string;
};

export function PortfolioCardTransition({
  slug,
  coverUrl,
  title,
  photographerName,
  location,
  speciality,
  children,
  className = "",
}: PortfolioCardTransitionProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { startTransition } = usePortfolioTransition();

  const handlePointerEnter = () => {
    // Warm up the route cache
    router.prefetch(`/portfolio/${slug}`);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Allow normal new-tab behaviour if Cmd, Ctrl, Shift or Alt is pressed
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    // Only intercept if target was a link to this portfolio
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || !href.includes(`/portfolio/${slug}`)) {
      return;
    }

    e.preventDefault();

    const element = cardRef.current;
    if (!element) {
      router.push(`/portfolio/${slug}`);
      return;
    }

    const rect = element.getBoundingClientRect();

    startTransition({
      slug,
      coverUrl,
      title,
      photographerName,
      location,
      speciality,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onClickCapture={handleClick}
      className={`portfolio-card-transition-wrapper ${className}`}
    >
      {children}
    </div>
  );
}

