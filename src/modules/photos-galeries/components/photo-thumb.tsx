"use client";

import { Check, Copy, EyeOff, ScanEye, Sparkles } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { cn } from "@/lib/utils";
import type { Photo } from "../galerie.types";

/** Score color: green ≥ 85, amber ≥ 60, red below. */
export function scoreTone(score: number) {
  return score >= 85
    ? "text-success-text"
    : score >= 60
      ? "text-warning-text"
      : "text-destructive-text";
}

/** AI labels shown on a photo: blurry, closed eyes, duplicate. */
export function AILabels({ photo, className }: { photo: Photo; className?: string }) {
  const labels = [
    photo.estFloue && { text: "Blurry", icon: EyeOff, cls: "bg-destructive text-white" },
    photo.yeuxFermes && { text: "Eyes closed", icon: ScanEye, cls: "bg-warning text-charcoal" },
    photo.groupeDoublon && { text: "Duplicate", icon: Copy, cls: "bg-charcoal/85 text-white" },
  ].filter(Boolean) as { text: string; icon: typeof Copy; cls: string }[];
  if (!labels.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {labels.map(({ text, icon: Icon, cls }) => (
        <span
          key={text}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold shadow-sm",
            cls,
          )}
        >
          <Icon className="size-3" aria-hidden />
          {text}
        </span>
      ))}
    </div>
  );
}

/** Photo tile with selection checkbox, AI score and AI labels. */
export function PhotoThumb({
  photo,
  selected,
  active,
  onToggle,
  onOpen,
  className,
}: {
  photo: Photo;
  selected: boolean;
  active?: boolean;
  onToggle: () => void;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-[4/5] overflow-hidden rounded-xl bg-muted ring-offset-2 transition-shadow",
        selected && "ring-3 ring-primary",
        active && !selected && "ring-2 ring-charcoal/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-xl"
        aria-label={`Open ${photo.nomFichier}`}
      >
        <SafeImage
          src={photo.urlMiniature}
          alt={photo.tagsIA.join(", ")}
          fill
          sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent to-charcoal/20 opacity-70 transition-opacity group-hover:opacity-100" />
      </button>

      <label
        className={cn(
          "absolute top-2 left-2 grid size-6 cursor-pointer place-items-center rounded-md border-2 shadow-sm transition-all has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60",
          selected
            ? "border-primary bg-primary text-white"
            : "border-white bg-white/30 text-transparent opacity-80 group-hover:opacity-100",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${photo.nomFichier}`}
        />
        <Check className="size-3.5" aria-hidden />
      </label>

      <span
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[0.7rem] font-bold shadow-sm"
        title="AI quality score"
      >
        <Sparkles className="size-3 text-ai" aria-hidden />
        <span className={scoreTone(photo.scoreQualite)}>{photo.scoreQualite}</span>
      </span>

      <AILabels photo={photo} className="pointer-events-none absolute bottom-2 left-2" />
    </div>
  );
}
