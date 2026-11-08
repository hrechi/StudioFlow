"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PHOTO_MAX_BYTES, type Photo } from "../../galerie.types";
import { editForOtherPhoto, filterPreset, type EditState } from "../../photo-edit";
import { exportEdit } from "../../photo-edit.render";
import { loadPhotoImage, uploadEditedPhoto } from "./save-edit";

type Run = { done: number; total: number; failed: string[] };

/**
 * "Apply to photos…": the current settings on other photos of the same gallery. Each one is
 * rendered here in the browser, like the photo being edited, and added as a new edited copy.
 */
export function ApplyToPhotosDialog({
  photos,
  currentId,
  state,
  disabled,
}: {
  photos: Photo[];
  currentId: string;
  state: EditState;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set([currentId]));
  const [withGeometry, setWithGeometry] = useState(false);
  const [withTexts, setWithTexts] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const running = run !== null && run.done < run.total;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async () => {
    // A copy of the settings as they are now: editing during the run changes nothing.
    const edit = editForOtherPhoto(state, { geometry: withGeometry, texts: withTexts });
    const style = filterPreset(state.filter.id)?.label ?? "Custom";
    const queue = photos.filter((p) => selected.has(p.id));
    const failed: string[] = [];
    setRun({ done: 0, total: queue.length, failed });
    for (const [index, photo] of queue.entries()) {
      try {
        // Let the progress bar paint before each heavy render.
        await new Promise((resolve) => setTimeout(resolve, 20));
        const image = await loadPhotoImage(photo.url);
        const blob = await exportEdit(image, edit, PHOTO_MAX_BYTES);
        await uploadEditedPhoto(photo, blob, style);
      } catch {
        failed.push(photo.nomFichier);
      }
      setRun({ done: index + 1, total: queue.length, failed: [...failed] });
    }
    const saved = queue.length - failed.length;
    router.refresh();
    if (failed.length === 0) {
      toast.success(`${saved} edited ${saved === 1 ? "photo" : "photos"} added to the gallery`, {
        description: "The originals stay as they were.",
        action: {
          label: "View",
          onClick: () => router.push(`/dashboard/galeries/${photos[0]?.galerieId}?onglet=editees`),
        },
      });
      setOpen(false);
    } else {
      toast.error(`${failed.length} of ${queue.length} photos could not be saved`, {
        description: failed.slice(0, 3).join(", ") + (failed.length > 3 ? "…" : ""),
      });
    }
  };

  const allSelected = selected.size === photos.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (running) return; // closing mid-run would hide the progress, not stop the work
        setOpen(next);
        if (next) setRun(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Copy aria-hidden />
          Apply to photos…
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply these edits to other photos</DialogTitle>
          <DialogDescription>
            The adjustments, filter and colors are copied to each photo you select. Each one is
            added to the gallery as a new edited copy; the originals are not changed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {selected.size} of {photos.length} selected
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={running}
            onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}
          >
            {allSelected ? "Clear selection" : "Select all"}
          </Button>
        </div>

        <ul className="grid max-h-[45dvh] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={running}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-lg ring-1 ring-border transition",
                    isSelected ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100",
                  )}
                >
                  <span className="relative block aspect-square bg-muted">
                    <SafeImage src={p.urlMiniature} alt="" fill sizes="120px" className="object-cover" />
                  </span>
                  <span
                    className={cn(
                      "absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full ring-1",
                      isSelected
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-black/40 text-transparent ring-white/70",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5" />
                  </span>
                  {p.id === currentId && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                      This photo
                    </span>
                  )}
                  {p.estEditee && p.id !== currentId && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                      Edited
                    </span>
                  )}
                  <span className="sr-only">{p.nomFichier}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={withGeometry}
              disabled={running}
              onCheckedChange={(v) => setWithGeometry(v === true)}
            />
            Also apply crop & rotation
          </Label>
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={withTexts}
              disabled={running}
              onCheckedChange={(v) => setWithTexts(v === true)}
            />
            Also apply text
          </Label>
        </div>

        {run && (
          <div className="space-y-1.5" aria-live="polite">
            <Progress value={(run.done / Math.max(1, run.total)) * 100} />
            <p className="text-xs text-muted-foreground">
              {running
                ? `Editing photo ${run.done + 1} of ${run.total}…`
                : `Done: ${run.total - run.failed.length} saved${run.failed.length ? `, ${run.failed.length} failed` : ""}.`}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={running} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={running || selected.size === 0} onClick={start}>
            {running && <Loader2 className="animate-spin" aria-hidden />}
            {running
              ? "Applying…"
              : `Apply to ${selected.size} ${selected.size === 1 ? "photo" : "photos"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
