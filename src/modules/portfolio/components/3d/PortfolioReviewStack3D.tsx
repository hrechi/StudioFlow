"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

export type TestimonialItem = {
  id: string;
  auteur: string;
  role?: string;
  note: number;
  texte: string;
};

export function PortfolioReviewStack3D({
  reviews = [],
}: {
  reviews?: TestimonialItem[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!reviews || reviews.length === 0) return null;

  const current = reviews[currentIndex];

  const prev = () => {
    setCurrentIndex((p) => (p - 1 + reviews.length) % reviews.length);
  };

  const next = () => {
    setCurrentIndex((p) => (p + 1) % reviews.length);
  };

  return (
    <div className="relative mt-8 flex flex-col items-center">
      <div
        className="relative w-full max-w-3xl"
        style={{
          perspective: "1200px",
        }}
      >
        {/* Carte principale */}
        <div
          className="relative rounded-[20px] border p-8 shadow-2xl backdrop-blur-md transition-all duration-500 sm:p-10"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
            transform: "translateZ(30px)",
          }}
        >
          <Quote
            className="size-9 opacity-30"
            style={{ color: "var(--portfolio-accent)" }}
          />

          <p className="mt-4 font-serif text-lg leading-relaxed sm:text-xl md:text-2xl">
            &ldquo;{current.texte}&rdquo;
          </p>

          <div
            className="mt-8 flex flex-col justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center"
            style={{ borderColor: "var(--portfolio-border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-full font-serif text-base font-semibold text-white shadow-md"
                style={{ backgroundColor: "var(--portfolio-accent)" }}
              >
                {current.auteur.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-sans text-sm font-semibold">{current.auteur}</h4>
                {current.role && (
                  <p
                    className="font-mono text-[10px] uppercase"
                    style={{ color: "var(--portfolio-muted)" }}
                  >
                    {current.role}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: current.note || 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="size-4 fill-current"
                  style={{ color: "var(--portfolio-accent)" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Effet de profondeur : cartes arrières décoratives */}
        <div
          className="pointer-events-none absolute -bottom-3 inset-x-4 -z-10 h-20 rounded-[20px] border opacity-60 backdrop-blur-xs"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
            transform: "translateZ(-20px) translateY(12px) scale(0.96)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-6 inset-x-8 -z-20 h-20 rounded-[20px] border opacity-30"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
            transform: "translateZ(-50px) translateY(24px) scale(0.92)",
          }}
        />
      </div>

      {/* Navigation */}
      {reviews.length > 1 && (
        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={prev}
            className="flex size-10 items-center justify-center rounded-full border transition-colors hover:scale-105"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "var(--portfolio-surface)",
            }}
            aria-label="Previous review"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? "w-6" : "w-1.5 opacity-40 hover:opacity-100"
                }`}
                style={{ backgroundColor: "var(--portfolio-accent)" }}
                aria-label={`Go to review ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className="flex size-10 items-center justify-center rounded-full border transition-colors hover:scale-105"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "var(--portfolio-surface)",
            }}
            aria-label="Next review"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

