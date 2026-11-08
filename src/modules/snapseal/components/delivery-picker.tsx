"use client";

import { Check, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Photo } from "@/modules/photos-galeries/galerie.types";

/**
 * The delivery is chosen IN THE GALLERY, not from the computer. Pre-selected: for each photo
 * the client validated, its newest edited copy (the retouched file), or the original if it has
 * none. The photographer can add or remove any photo of the gallery.
 */
export function defaultDeliveryIds(photos: Photo[], selectedPhotoIds: Set<string>): string[] {
  return photos
    .filter((p) => selectedPhotoIds.has(p.id))
    .map((original) => {
      const edits = photos
        .filter((p) => p.estEditee && p.photoOrigineId === original.id)
        .sort((a, b) => b.dateUpload.localeCompare(a.dateUpload));
      return edits[0]?.id ?? original.id;
    });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DeliveryPicker({
  photos,
  selectedPhotoIds,
  initialIds,
  busy,
  onBuild,
}: {
  photos: Photo[];
  selectedPhotoIds: Set<string>;
  initialIds?: string[];
  busy: boolean;
  onBuild: (photoIds: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(
    () => initialIds ?? defaultDeliveryIds(photos, selectedPhotoIds),
  );
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const total = photos.filter((p) => pickedSet.has(p.id)).reduce((sum, p) => sum + p.taille, 0);
  // Retouched copies and the client's choices first, then the rest of the gallery.
  const ordered = useMemo(() => {
    const rank = (p: Photo) =>
      p.estEditee ? 0 : selectedPhotoIds.has(p.id) ? 1 : p.statutCulling === "REJETEE" ? 3 : 2;
    return [...photos].sort((a, b) => rank(a) - rank(b));
  }, [photos, selectedPhotoIds]);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {picked.length} photo{picked.length === 1 ? "" : "s"} · {formatBytes(total)}
        </span>
        <span className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setPicked(defaultDeliveryIds(photos, selectedPhotoIds))}
          >
            Client&apos;s selection
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPicked([])}>
            Clear
          </Button>
        </span>
      </div>
      <ul className="grid max-h-[26rem] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4 lg:grid-cols-6">
        {ordered.map((photo) => {
          const isPicked = pickedSet.has(photo.id);
          return (
            <li key={photo.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle(photo.id)}
                aria-pressed={isPicked}
                className={cn(
                  "relative block w-full overflow-hidden rounded-lg ring-1 ring-border transition",
                  isPicked ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                )}
              >
                <span className="relative block aspect-square bg-muted">
                  <SafeImage src={photo.urlMiniature} alt="" fill sizes="140px" className="object-cover" />
                </span>
                <span
                  className={cn(
                    "absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full ring-1",
                    isPicked
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-black/40 text-transparent ring-white/70",
                  )}
                  aria-hidden
                >
                  <Check className="size-3.5" />
                </span>
                <span className="absolute bottom-1.5 left-1.5 flex gap-1">
                  {photo.estEditee && (
                    <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                      Retouched
                    </span>
                  )}
                  {selectedPhotoIds.has(photo.id) && (
                    <span className="rounded-full bg-success px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                      Chosen
                    </span>
                  )}
                </span>
                <span className="sr-only">{photo.nomFichier}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button disabled={busy || picked.length === 0} onClick={() => onBuild(picked)}>
        <PackageCheck aria-hidden />
        {busy ? "Building the package…" : "Build the delivery package"}
      </Button>
    </div>
  );
}
