"use client";

import {
  ArrowLeft,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Crop,
  Type,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHOTO_MAX_BYTES, type Photo } from "../../galerie.types";
import {
  FULL_CROP,
  filterPreset,
  neutralEditState,
  type CropRect,
  type EditState,
  type TextLayer,
} from "../../photo-edit";
import { exportEdit, outputSize, renderEdit } from "../../photo-edit.render";
import { CropOverlay, TextOverlay } from "./overlays";
import { AIPanel, AdjustPanel, CropPanel, FiltersPanel, TextPanel } from "./tool-panels";

type Tool = "adjust" | "filters" | "crop" | "text" | "ai";

const TOOLS: { value: Tool; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "adjust", label: "Adjust", icon: SlidersHorizontal },
  { value: "filters", label: "Filters", icon: Wand2 },
  { value: "crop", label: "Crop", icon: Crop },
  { value: "text", label: "Text", icon: Type },
  { value: "ai", label: "AI", icon: Sparkles },
];

const PREVIEW_MAX_SIDE = 1600;
const HISTORY_MAX = 50;

/** The loaded photo: the full image for saving, a smaller copy for a fluid live preview. */
export type LoadedPhoto = {
  image: HTMLImageElement;
  base: HTMLCanvasElement;
  w: number;
  h: number;
};

type History = { past: EditState[]; present: EditState; committed: EditState; future: EditState[] };

/**
 * Undo / redo. `update` changes the picture live (a slider moving); `commit` makes it one undo step
 * (the slider released), so one drag is one step rather than hundreds.
 */
function useEditHistory() {
  const [history, setHistory] = useState<History>(() => {
    const initial = neutralEditState();
    return { past: [], present: initial, committed: initial, future: [] };
  });
  const update = useCallback((change: (state: EditState) => EditState) => {
    setHistory((h) => ({ ...h, present: change(h.present) }));
  }, []);
  const commit = useCallback(() => {
    setHistory((h) =>
      h.present === h.committed
        ? h
        : {
            past: [...h.past, h.committed].slice(-HISTORY_MAX),
            present: h.present,
            committed: h.present,
            future: [],
          },
    );
  }, []);
  const apply = useCallback(
    (change: (state: EditState) => EditState) => {
      update(change);
      commit();
    },
    [update, commit],
  );
  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h.past.at(-1);
      if (!previous) return h;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        committed: previous,
        future: [h.committed, ...h.future],
      };
    });
  }, []);
  const redo = useCallback(() => {
    setHistory((h) => {
      const [next, ...future] = h.future;
      if (!next) return h;
      return { past: [...h.past, h.committed], present: next, committed: next, future };
    });
  }, []);
  return {
    state: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    update,
    commit,
    apply,
    undo,
    redo,
  };
}

function editedFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/-edited$/, "");
  return `${base}-edited.jpg`;
}

/** /dashboard/photos/editeur?photo=… — the workspace. The original photo is never changed. */
export function PhotoEditor({ photo }: { photo: Photo }) {
  const router = useRouter();
  const { state, canUndo, canRedo, update, commit, apply, undo, redo } = useEditHistory();
  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);
  const [failed, setFailed] = useState(false);
  const [tool, setTool] = useState<Tool>("adjust");
  const [comparing, setComparing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [saving, setSaving] = useState<"gallery" | "download" | null>(null);
  const [savedState, setSavedState] = useState<EditState | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Same origin (/api/photos/…), so the canvas can read the pixels back.
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const scale = Math.min(
        1,
        PREVIEW_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const base = document.createElement("canvas");
      base.width = Math.round(image.naturalWidth * scale);
      base.height = Math.round(image.naturalHeight * scale);
      base.getContext("2d")?.drawImage(image, 0, 0, base.width, base.height);
      setLoaded({ image, base, w: base.width, h: base.height });
    };
    image.onerror = () => alive && setFailed(true);
    image.src = photo.url;
    return () => {
      alive = false;
    };
  }, [photo.url]);

  useEffect(() => {
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);

  const cropping = tool === "crop";
  const shownCrop = cropping ? FULL_CROP : state.geometry.crop;

  // One redraw per frame at most, however fast a slider moves.
  useEffect(() => {
    if (!loaded) return;
    const frame = requestAnimationFrame(() => {
      if (canvasRef.current) {
        renderEdit(canvasRef.current, loaded.base, loaded.w, loaded.h, state, {
          applyCrop: !cropping,
          applyEdits: !comparing,
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [loaded, state, cropping, comparing]);

  const dirty = state !== savedState && (canUndo || state.texts.length > 0);

  // Closing the tab with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const zoomed = cropping ? 1 : zoom;
  let display = { w: 0, h: 0 };
  if (loaded && stageSize.w > 0 && stageSize.h > 0) {
    const size = outputSize(loaded.w, loaded.h, state.geometry, shownCrop);
    const fit = Math.min(stageSize.w / size.w, stageSize.h / size.h);
    display = { w: size.w * fit * zoomed, h: size.h * fit * zoomed };
  }

  const setCrop = (crop: CropRect) =>
    update((s) => ({ ...s, geometry: { ...s.geometry, crop } }));

  const setTextLayer = (id: string, change: Partial<TextLayer>) =>
    update((s) => ({
      ...s,
      texts: s.texts.map((t) => (t.id === id ? { ...t, ...change } : t)),
    }));

  /** Renders the full-size JPEG. On the next tick, so "Saving…" shows before the work starts. */
  const renderFile = async (): Promise<Blob> => {
    if (!loaded) throw new Error("The photo is not loaded yet.");
    await new Promise((resolve) => setTimeout(resolve, 30));
    return exportEdit(loaded.image, state, PHOTO_MAX_BYTES);
  };

  const download = async () => {
    setSaving("download");
    try {
      const url = URL.createObjectURL(await renderFile());
      const link = document.createElement("a");
      link.href = url;
      link.download = editedFileName(photo.nomFichier);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Download failed", { description: (error as Error).message });
    } finally {
      setSaving(null);
    }
  };

  const addToGallery = async () => {
    setSaving("gallery");
    try {
      const blob = await renderFile();
      const form = new FormData();
      form.set("galerieId", photo.galerieId);
      form.set("photoOrigine", photo.id);
      form.set("styleApplique", filterPreset(state.filter.id)?.label ?? "Custom");
      form.set("file", new File([blob], editedFileName(photo.nomFichier), { type: "image/jpeg" }));
      const response = await fetch("/api/photos/upload", { method: "POST", body: form });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "The photo could not be saved.");
      setSavedState(state);
      toast.success("Edited photo added to the gallery", {
        description: "The original stays as it was.",
        action: {
          label: "View",
          onClick: () => router.push(`/dashboard/galeries/${photo.galerieId}?onglet=editees`),
        },
      });
    } catch (error) {
      toast.error("Could not add the photo", { description: (error as Error).message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/dashboard/photos/editeur?galerie=${photo.galerieId}`}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Photos
          </Link>
          <span className="truncate text-sm text-foreground">{photo.nomFichier}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Start over"
            title="Start over"
            disabled={!canUndo}
            onClick={() => apply(() => neutralEditState())}
          >
            <RotateCcw aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Press and hold to see the original colors"
            className="touch-none select-none"
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            onPointerCancel={() => setComparing(false)}
          >
            <Eye aria-hidden />
            Compare
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={download}
            disabled={!loaded || saving !== null}
          >
            {saving === "download" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Download aria-hidden />
            )}
            Download
          </Button>
          <Button size="sm" onClick={addToGallery} disabled={!loaded || saving !== null}>
            {saving === "gallery" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <ImagePlus aria-hidden />
            )}
            {saving === "gallery" ? "Saving…" : "Add to gallery"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* A neutral dark surface, in both themes: colors are judged against it. */}
        <div className="relative overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-border">
          <div
            ref={setStage}
            className="h-[52dvh] overflow-auto p-3 lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem]"
          >
            {failed ? (
              <p className="flex h-full items-center justify-center text-sm text-neutral-300">
                This photo could not be loaded.
              </p>
            ) : !loaded ? (
              <p className="flex h-full items-center justify-center gap-2 text-sm text-neutral-300">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading the photo…
              </p>
            ) : (
              <div className="flex min-h-full min-w-full items-center justify-center">
                <div className="relative shrink-0" style={{ width: display.w, height: display.h }}>
                  <canvas
                    ref={canvasRef}
                    className="block size-full"
                    aria-label={`Preview of ${photo.nomFichier}`}
                  />
                  {cropping && (
                    <CropOverlay
                      crop={state.geometry.crop}
                      ratio={ratio}
                      imageAspect={
                        outputSize(loaded.w, loaded.h, state.geometry, FULL_CROP).w /
                        outputSize(loaded.w, loaded.h, state.geometry, FULL_CROP).h
                      }
                      onChange={setCrop}
                      onCommit={commit}
                    />
                  )}
                  {tool === "text" && (
                    <TextOverlay
                      texts={state.texts}
                      selected={selectedText}
                      displayHeight={display.h}
                      onSelect={setSelectedText}
                      onMove={(id, x, y) => setTextLayer(id, { x, y })}
                      onCommit={commit}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          {comparing && (
            <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
              Original colors
            </span>
          )}
          {!cropping && (
            <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/70 p-1 text-white">
              <button
                type="button"
                aria-label="Zoom out"
                className="grid size-7 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
                disabled={zoom <= 1}
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              >
                <ZoomOut className="size-4" aria-hidden />
              </button>
              <span className="w-10 text-center text-xs tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                className="grid size-7 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
                disabled={zoom >= 4}
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              >
                <ZoomIn className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem]">
          <div role="tablist" aria-label="Editing tools" className="flex shrink-0 border-b">
            {TOOLS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tool === value}
                onClick={() => setTool(value)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
                  tool === value
                    ? "border-b-2 border-primary text-foreground"
                    : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tool === "adjust" && <AdjustPanel state={state} update={update} commit={commit} />}
            {tool === "filters" && loaded && (
              <FiltersPanel
                state={state}
                base={loaded.base}
                update={update}
                commit={commit}
                apply={apply}
              />
            )}
            {tool === "crop" && loaded && (
              <CropPanel
                state={state}
                loaded={loaded}
                ratio={ratio}
                setRatio={setRatio}
                update={update}
                commit={commit}
                apply={apply}
              />
            )}
            {tool === "text" && (
              <TextPanel
                state={state}
                selected={selectedText}
                setSelected={setSelectedText}
                setLayer={setTextLayer}
                commit={commit}
                apply={apply}
              />
            )}
            {tool === "ai" && <AIPanel photoId={photo.id} apply={apply} />}
          </div>
        </div>
      </div>
    </div>
  );
}
