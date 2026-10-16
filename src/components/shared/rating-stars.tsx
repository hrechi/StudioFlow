"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Read-only star rating (1–5). */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            "size-4",
            star <= value ? "fill-warning text-warning" : "fill-light-gray text-light-gray",
          )}
        />
      ))}
    </span>
  );
}

/** Interactive star picker (radio group, keyboard accessible). */
export function RatingInput({
  value,
  onChange,
  name = "note",
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className="flex gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          />
          <Star
            aria-hidden
            onMouseEnter={() => setHover(star)}
            className={cn(
              "size-7 transition-colors",
              star <= shown ? "fill-warning text-warning" : "fill-light-gray text-light-gray",
            )}
          />
        </label>
      ))}
    </div>
  );
}
