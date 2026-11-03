"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Expand, Footprints, Grid2X2, Heart, Shrink } from "lucide-react";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createGalleryLayout, MAX_GALLERY_PHOTOS } from "./layout";
import type { GalleryPhoto } from "./types";

type GallerySceneProps = {
  layout: ReturnType<typeof createGalleryLayout>;
  activeIndex: number;
  navigationMode: "guided" | "free";
  lowPower: boolean;
  onSelectPhoto: (index: number) => void;
  onSelectViewpoint: (index: number) => void;
  onPointerLockChange: (locked: boolean) => void;
  onTextureError: (error: unknown) => void;
};

const GalleryScene = dynamic<GallerySceneProps>(() => import("./GalleryScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#242423] text-sm text-white/80">
      Loading 3D exhibition...
    </div>
  ),
});

type SceneBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

class SceneErrorBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("The 3D gallery render failed.", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL(): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!context) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

function GalleryGrid({
  photos,
  onSelect,
}: {
  photos: GalleryPhoto[];
  onSelect: (index: number) => void;
}) {
  return (
    <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className="overflow-hidden rounded-xl border"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
          }}
        >
          <button type="button" className="block w-full text-left" onClick={() => onSelect(index)}>
            <div
              className="relative aspect-[4/3]"
              style={{ backgroundColor: "var(--portfolio-surface)" }}
            >
              <SafeImage
                src={photo.thumbnailUrl || photo.url}
                alt={photo.alt}
                fill
                unoptimized
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <span className="block p-3">
              <span className="block truncate text-sm font-medium">{photo.title}</span>
              {photo.description && (
                <span
                  className="mt-1 line-clamp-2 block text-xs"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {photo.description}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Gallery3D({
  id,
  title,
  photos,
  portfolioId,
  slug,
  enableLikes = true,
}: {
  id?: string;
  title: string;
  photos: GalleryPhoto[];
  portfolioId: string;
  slug: string;
  enableLikes?: boolean;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [webGL, setWebGL] = useState<boolean | null>(null);
  const [lowPower, setLowPower] = useState(false);
  const [forceGrid, setForceGrid] = useState(false);
  const [supportsPointerLock, setSupportsPointerLock] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [viewMode, setViewMode] = useState<"3d" | "grid">("grid");
  const [navigationMode, setNavigationMode] = useState<"guided" | "free">("guided");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [likeError, setLikeError] = useState("");
  const displayedPhotos = useMemo(() => photos.slice(0, MAX_GALLERY_PHOTOS), [photos]);
  const layout = useMemo(() => createGalleryLayout(displayedPhotos), [displayedPhotos]);
  const currentPhoto = selectedIndex === null ? null : displayedPhotos[selectedIndex];
  const canRender3d = webGL === true && !forceGrid && !sceneFailed;
  const handleTextureError = useCallback((error: unknown) => {
    console.error("A 3D gallery photo could not be loaded.", error);
    setSceneFailed(true);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const supported = supportsWebGL();
      const browser = navigator as Navigator & { deviceMemory?: number };
      const weakDevice =
        (browser.deviceMemory !== undefined && browser.deviceMemory <= 2) ||
        navigator.hardwareConcurrency <= 2;
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      setWebGL(supported);
      setLowPower(weakDevice || mobile);
      setForceGrid(weakDevice);
      setViewMode(supported && !weakDevice ? "3d" : "grid");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setSceneReady(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSceneReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSupportsPointerLock(window.matchMedia("(pointer: fine)").matches);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight")
        setSelectedIndex((index) => (index! + 1) % displayedPhotos.length);
      if (event.key === "ArrowLeft")
        setSelectedIndex((index) => (index! - 1 + displayedPhotos.length) % displayedPhotos.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [displayedPhotos.length, selectedIndex]);

  function selectPhoto(index: number) {
    setActiveIndex(index);
    setSelectedIndex(index);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch (error) {
      console.error("Unable to change the gallery fullscreen mode.", error);
    }
  }

  async function likePhoto() {
    if (!currentPhoto) return;
    setLikeError("");
    try {
      const response = await fetch(`/api/portfolio/${encodeURIComponent(slug)}/like`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portfolioId, elementId: currentPhoto.id }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setLikeError(result.message ?? "Unable to like this photo right now.");
        return;
      }
      setLiked((previous) => new Set(previous).add(currentPhoto.id));
    } catch (error) {
      console.error("Unable to submit the photo like.", error);
      setLikeError("Unable to submit your appreciation. Please try again.");
    }
  }

  if (displayedPhotos.length === 0) return null;

  return (
    <section
      ref={rootRef}
      id={id}
      aria-label={title}
      className={`overflow-hidden rounded-2xl ${
        isFullscreen ? "fixed inset-0 z-[100] h-dvh rounded-none" : ""
      }`}
      style={{ backgroundColor: "var(--portfolio-bg)", color: "var(--portfolio-text)" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--portfolio-border)", backgroundColor: "var(--portfolio-bg)" }}
      >
        <div>
          <h2 className="font-serif text-lg font-semibold sm:text-xl">{title}</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--portfolio-muted)" }}>
            {displayedPhotos.length} photograph{displayedPhotos.length === 1 ? "" : "s"} · Photographic
            exhibition
          </p>
          {photos.length > MAX_GALLERY_PHOTOS && (
            <p className="mt-1 text-xs" style={{ color: "var(--portfolio-muted)" }}>
              The first {MAX_GALLERY_PHOTOS} photos are displayed ({photos.length} total).
            </p>
          )}
        </div>
        <nav aria-label="Gallery controls" className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRender3d}
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode((mode) => (mode === "grid" ? "3d" : "grid"))}
            className="hover:bg-[var(--portfolio-surface)]"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "var(--portfolio-surface)",
              color: "var(--portfolio-text)",
            }}
          >
            <Grid2X2 aria-hidden />
            {!canRender3d
              ? "Grid gallery"
              : viewMode === "grid"
                ? "3D Tour"
                : "Simple view (grid)"}
          </Button>
          {canRender3d && supportsPointerLock && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNavigationMode((mode) => (mode === "guided" ? "free" : "guided"))}
              className="hover:bg-[var(--portfolio-surface)]"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
                color: "var(--portfolio-text)",
              }}
            >
              <Footprints aria-hidden />
              {navigationMode === "guided" ? "Free walk" : "Guided tour"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="hover:bg-[var(--portfolio-surface)]"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "var(--portfolio-surface)",
              color: "var(--portfolio-text)",
            }}
          >
            {isFullscreen ? <Shrink aria-hidden /> : <Expand aria-hidden />}
          </Button>
        </nav>
      </header>

      <div
        className={`relative ${isFullscreen ? "h-[calc(100dvh-120px)]" : "h-[min(72svh,780px)] min-h-[420px]"}`}
      >
        {canRender3d && viewMode === "3d" && sceneReady ? (
          <>
            <SceneErrorBoundary onError={() => setSceneFailed(true)}>
              <GalleryScene
                layout={layout}
                activeIndex={activeIndex}
                navigationMode={navigationMode}
                lowPower={lowPower}
                onSelectPhoto={selectPhoto}
                onSelectViewpoint={setActiveIndex}
                onPointerLockChange={setIsPointerLocked}
                onTextureError={handleTextureError}
              />
            </SceneErrorBoundary>
            {showGuide && (
              <div className="absolute top-3 left-3 z-10 flex max-w-[min(90%,28rem)] items-start gap-3 rounded-xl border border-white/15 bg-black/70 p-3 text-xs text-white shadow-lg backdrop-blur">
                <p>
                  Drag to look around. Floor points change the viewpoint; click a frame to open the
                  photo.
                </p>
                <button
                  type="button"
                  aria-label="Hide tour guide"
                  onClick={() => setShowGuide(false)}
                  className="shrink-0 rounded px-1 text-white/70 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
            {navigationMode === "guided" ? (
              <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3 px-3">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Previous viewpoint"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                >
                  <ArrowLeft aria-hidden />
                </Button>
                <p className="rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur">
                  {activeIndex + 1} / {displayedPhotos.length} · Drag to look around
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Next viewpoint"
                  disabled={activeIndex === displayedPhotos.length - 1}
                  onClick={() =>
                    setActiveIndex((index) => Math.min(displayedPhotos.length - 1, index + 1))
                  }
                >
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            ) : (
              <p className="absolute inset-x-3 bottom-4 z-10 mx-auto w-fit rounded-full bg-black/70 px-4 py-2 text-center text-xs text-white">
                {isPointerLocked
                  ? "WASD / arrow keys to walk · Esc to release the mouse"
                  : "Click inside the room to activate the mouse, then use WASD or the arrow keys"}
              </p>
            )}
          </>
        ) : (
          <div className="h-full overflow-y-auto">
            {!canRender3d && (
              <p
                className="border-b px-4 py-2 text-center text-xs"
                style={{
                  borderColor: "var(--portfolio-border)",
                  color: "var(--portfolio-muted)",
                  backgroundColor: "var(--portfolio-surface)",
                }}
              >
                The 3D tour is not available on this device. The gallery remains available as a
                grid.
              </p>
            )}
            <GalleryGrid photos={displayedPhotos} onSelect={selectPhoto} />
          </div>
        )}
      </div>

      {canRender3d && viewMode === "3d" && (
        <div
          className="border-t px-4 py-3 sm:px-6"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <details>
            <summary
              className="w-fit cursor-pointer text-xs underline underline-offset-4"
              style={{
                color: "var(--portfolio-muted)",
                textDecorationColor: "var(--portfolio-border)",
              }}
            >
              Browse photos in grid view
            </summary>
            <GalleryGrid photos={displayedPhotos} onSelect={selectPhoto} />
          </details>
        </div>
      )}

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      >
        <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto border-white/15 bg-[#171716] p-0 text-white">
          {currentPhoto && (
            <>
              <div className="relative aspect-[4/3] max-h-[68dvh] bg-black/30">
                <SafeImage
                  src={currentPhoto.url || currentPhoto.thumbnailUrl}
                  alt={currentPhoto.alt}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 80vw, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="space-y-3 p-5 sm:p-7">
                <DialogTitle className="font-serif text-2xl">{currentPhoto.title}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-white/70">
                  {currentPhoto.description || currentPhoto.alt}
                </DialogDescription>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const index =
                        (selectedIndex! - 1 + displayedPhotos.length) % displayedPhotos.length;
                      setSelectedIndex(index);
                      setActiveIndex(index);
                    }}
                    className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                  >
                    <ArrowLeft aria-hidden />
                    Previous
                  </Button>
                  {enableLikes && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={liked.has(currentPhoto.id)}
                      onClick={() => void likePhoto()}
                      className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                    >
                      <Heart
                        aria-hidden
                        className={liked.has(currentPhoto.id) ? "fill-current text-pink-400" : ""}
                      />
                      {currentPhoto.likes + Number(liked.has(currentPhoto.id))}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const index = (selectedIndex! + 1) % displayedPhotos.length;
                      setSelectedIndex(index);
                      setActiveIndex(index);
                    }}
                    className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                  >
                    Next
                    <ArrowRight aria-hidden />
                  </Button>
                </div>
                {likeError && (
                  <p role="status" className="text-sm text-red-300">
                    {likeError}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
