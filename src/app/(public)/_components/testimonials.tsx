"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RatingStars } from "@/components/shared/rating-stars";
import { cn } from "@/lib/utils";

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  context: string;
  note: number;
};

/**
 * One large quote at a time. Previous / next buttons and ← → keys; it advances
 * on its own every 8 s unless the visitor hovers, focuses it or prefers reduced motion.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => go(1), 8000);
    return () => window.clearInterval(timer);
  }, [paused, go, items.length]);

  if (!items.length) return null;
  const current = items[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <figure
        key={current.id}
        aria-live="polite"
        className="page-enter mx-auto max-w-4xl text-center"
      >
        <RatingStars value={current.note} className="justify-center [&_svg]:size-3.5" />
        <blockquote className="mt-8 font-heading text-2xl leading-snug font-light text-balance text-foreground sm:text-3xl lg:text-[2.6rem] lg:leading-[1.2]">
          “{current.quote}”
        </blockquote>
        <figcaption className="mt-10">
          <span className="block font-heading text-xs font-medium tracking-[0.32em] text-foreground uppercase">
            {current.author}
          </span>
          <span className="mt-2 block text-xs tracking-[0.2em] text-foreground/50 uppercase">
            {current.context}
          </span>
        </figcaption>
      </figure>

      <div className="mt-14 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous review"
          className="grid size-12 place-items-center border border-foreground/15 text-foreground transition-colors duration-500 hover:border-gold hover:text-gold"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div className="flex gap-2" role="tablist" aria-label="Choose a review">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Review ${i + 1} of ${items.length}`}
              onClick={() => setIndex(i)}
              className="grid h-6 place-items-center"
            >
              <span
                className={cn(
                  "block h-px transition-all duration-700",
                  i === index ? "w-10 bg-gold" : "w-5 bg-foreground/25",
                )}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next review"
          className="grid size-12 place-items-center border border-foreground/15 text-foreground transition-colors duration-500 hover:border-gold hover:text-gold"
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
