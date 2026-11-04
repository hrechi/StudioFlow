"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { PlancheContactData, PlancheContactFrame } from "../../portfolio.types";

export type FilmPhoto = {
  id: string;
  url: string;
  title?: string;
  timestamp?: number;
  caption?: string;
  number?: string;
};

export type PortfolioFilmStrip3DProps = {
  photos?: FilmPhoto[];
  frames?: PlancheContactFrame[];
  plancheContact?: PlancheContactData;
  videoUrl?: string;
  autoplay?: boolean;
  speed?: number; // Pixels per frame, default ~0.75
  className?: string;
};

// Subtle deterministic angle rotation (±1°) for authentic analog contact sheet feel
const ROTATION_PATTERNS = [-0.8, 0.6, -0.4, 0.9, -0.7, 0.5, -0.9, 0.4, -0.5, 0.8];
const subscribeToReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const reducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeToTouch = (onChange: () => void) => {
  const media = window.matchMedia("(pointer: coarse)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const touchSnapshot = () => window.matchMedia("(pointer: coarse)").matches;

export function PortfolioFilmStrip3D({
  photos = [],
  frames: customFrames,
  plancheContact,
  videoUrl: explicitVideoUrl,
  autoplay = true,
  speed = 0.75,
  className = "",
}: PortfolioFilmStrip3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);

  const isTouchDevice = useSyncExternalStore(subscribeToTouch, touchSnapshot, () => false);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  const [isPausedByHover, setIsPausedByHover] = useState(false);

  // Lightbox state
  const [activeLightboxFrame, setActiveLightboxFrame] = useState<FilmPhoto | null>(null);
  const [isLightboxPlaying, setIsLightboxPlaying] = useState(false);
  const [isLightboxMuted, setIsLightboxMuted] = useState(false);
  const [lightboxCurrentTime, setLightboxCurrentTime] = useState(0);
  const [lightboxDuration, setLightboxDuration] = useState(0);

  // Determine active video URL
  const effectiveVideoUrl = useMemo(() => {
    if (explicitVideoUrl) return explicitVideoUrl;
    if (plancheContact?.active && plancheContact.videoUrl) return plancheContact.videoUrl;
    return undefined;
  }, [explicitVideoUrl, plancheContact]);

  // Normalize frames list: prioritize video extracted frames from plancheContact
  const normalizedFrames: FilmPhoto[] = useMemo(() => {
    // 1. From plancheContact if active with frames (extracted from video in editor)
    if (plancheContact?.active !== false && plancheContact?.frames && plancheContact.frames.length > 0) {
      return [...plancheContact.frames]
        .sort((a, b) => a.order - b.order)
        .map((f, idx) => ({
          id: f.id,
          url: f.imageUrl,
          title: f.caption || `Frame ${(idx + 18).toString().padStart(2, "0")}A`,
          timestamp: f.timestamp,
          caption: f.caption,
          number: f.caption || `${(idx + 18).toString().padStart(2, "0")}A`,
        }));
    }

    // 2. From customFrames prop
    if (customFrames && customFrames.length > 0) {
      return [...customFrames]
        .sort((a, b) => a.order - b.order)
        .map((f, idx) => ({
          id: f.id,
          url: f.imageUrl,
          title: f.caption || `Frame ${(idx + 18).toString().padStart(2, "0")}A`,
          timestamp: f.timestamp,
          caption: f.caption,
          number: f.caption || `${(idx + 18).toString().padStart(2, "0")}A`,
        }));
    }

    // 3. Fallback from photos prop
    if (photos.length > 0) {
      const uniquePhotos = photos.filter(
        (photo, index, list) => list.findIndex((candidate) => candidate.url === photo.url) === index,
      );
      return uniquePhotos.slice(0, 16).map((photo, index) => ({
        ...photo,
        title: photo.title || "Silver Gelatin Print",
        timestamp: photo.timestamp ?? index * 1.5,
        number: `${(index + 18).toString().padStart(2, "0")}A`,
      }));
    }

    return [];
  }, [plancheContact, customFrames, photos]);

  // Duplicate items for continuous looping scroll
  const displayFrames = useMemo(() => {
    if (normalizedFrames.length === 0) return [];
    if (normalizedFrames.length < 8) {
      return [...normalizedFrames, ...normalizedFrames, ...normalizedFrames];
    }
    return [...normalizedFrames, ...normalizedFrames];
  }, [normalizedFrames]);

  // Smooth continuous auto-scroll loop
  useEffect(() => {
    if (!autoplay || reducedMotion || displayFrames.length === 0) return;

    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    let animId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const delta = (time - lastTime) / 16.666; // Normalized to 60fps
      lastTime = time;

      if (!isPausedByHover && scrollEl) {
        scrollEl.scrollLeft += speed * delta;
        const halfWidth = scrollEl.scrollWidth / 2;
        if (halfWidth > 0 && scrollEl.scrollLeft >= halfWidth) {
          scrollEl.scrollLeft -= halfWidth;
        }
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [autoplay, speed, reducedMotion, isPausedByHover, displayFrames.length]);

  // Parallax tilt on window scroll
  useEffect(() => {
    if (reducedMotion) return;

    const handleScroll = () => {
      const container = containerRef.current;
      const track = scrollContainerRef.current;
      if (!container || !track) return;

      const rect = container.getBoundingClientRect();
      const windowH = window.innerHeight;
      const progress = (windowH - rect.top) / (windowH + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const subtleTilt = (clamped - 0.5) * -1.2;

      track.style.transform = `rotateZ(${subtleTilt}deg) rotateY(1.5deg)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [reducedMotion]);

  // Lightbox handlers
  const handleOpenLightbox = (frame: FilmPhoto) => {
    setActiveLightboxFrame(frame);
    setIsLightboxPlaying(true);
    setIsPausedByHover(true);
  };

  const handleCloseLightbox = useCallback(() => {
    setActiveLightboxFrame(null);
    setIsLightboxPlaying(false);
    setIsPausedByHover(false);
  }, []);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!activeLightboxFrame) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseLightbox();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLightboxFrame, handleCloseLightbox]);

  // Sync lightbox video playback
  useEffect(() => {
    if (!activeLightboxFrame || !effectiveVideoUrl) return;

    const video = lightboxVideoRef.current;
    if (!video) return;

    const startTs = activeLightboxFrame.timestamp ?? 0;
    video.currentTime = startTs;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsLightboxPlaying(true))
        .catch(() => setIsLightboxPlaying(false));
    }
  }, [activeLightboxFrame, effectiveVideoUrl]);

  if (plancheContact && plancheContact.active === false) return null;
  if (normalizedFrames.length === 0) return null;

  return (
    <section
      ref={containerRef}
      aria-label="35mm Contact Sheet"
      className={`relative w-full overflow-hidden py-14 select-none ${className}`}
      style={{
        backgroundColor: "#1a0a08",
        backgroundImage:
          "radial-gradient(ellipse at 50% 50%, rgba(42, 17, 14, 0.7) 0%, #140706 100%)",
        perspective: "1400px",
      }}
      onMouseEnter={() => setIsPausedByHover(true)}
      onMouseLeave={() => {
        if (!activeLightboxFrame) setIsPausedByHover(false);
      }}
    >
      {/* Filet décoratif supérieur avec lueur ambrée */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(232, 163, 74, 0.3) 30%, rgba(232, 163, 74, 0.5) 50%, rgba(232, 163, 74, 0.3) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)",
        }}
      />

      {/* En-tête argentique Kodak Tri-X 400 */}
      <div className="container mx-auto mb-6 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(232,163,74,0.7)]"
            style={{ backgroundColor: "var(--portfolio-accent, #e8a34a)" }}
          />
          <h3 className="font-mono text-[10px] tracking-[0.22em] text-[#e8a34a] uppercase">
            ● 35mm Contact Sheet
          </h3>
          {effectiveVideoUrl && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-1.5 py-0.5 font-mono text-[8px] text-[#e8a34a]/90">
              <span className="size-1 rounded-full bg-[#e8a34a]" />
              Dynamic Loop
            </span>
          )}
        </div>

        <span className="font-mono text-[9px] tracking-widest text-[#a8998a]/70">
          KODAK TRI-X 400 · HANDCRAFTED EMULSION
        </span>
      </div>

      {/* Masques de fondu latéraux gauche & droite */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 sm:w-32"
        style={{
          background: "linear-gradient(to right, #1a0a08 0%, rgba(26, 10, 8, 0.8) 50%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 sm:w-32"
        style={{
          background: "linear-gradient(to left, #1a0a08 0%, rgba(26, 10, 8, 0.8) 50%, transparent 100%)",
        }}
      />

      {/* Conteneur défilant de la pellicule */}
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        role="region"
        aria-label="Scrolling filmstrip gallery"
        className="no-scrollbar flex overflow-x-auto scroll-smooth py-3 px-6 sm:px-12 focus:outline-hidden focus:ring-1 focus:ring-[#e8a34a]/40"
        style={{
          transformStyle: "preserve-3d",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex gap-4 sm:gap-5 shrink-0 will-change-transform">
          {displayFrames.map((frame, index) => (
            <FilmStripFrameCell
              key={`${frame.id}-${index}`}
              frame={frame}
              index={index}
              effectiveVideoUrl={effectiveVideoUrl}
              isTouchDevice={isTouchDevice}
              reducedMotion={reducedMotion}
              onOpenLightbox={handleOpenLightbox}
            />
          ))}
        </div>
      </div>

      {/* Lightbox Modal (Click / Tap sur une vignette) */}
      {activeLightboxFrame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Print details ${activeLightboxFrame.number || activeLightboxFrame.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8 backdrop-blur-md transition-all duration-300"
          onClick={handleCloseLightbox}
        >
          <div
            className="relative flex w-full max-w-4xl flex-col items-center overflow-hidden rounded-[8px] border border-white/15 bg-[#120b08] p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre de titre Lightbox */}
            <div className="mb-3 flex w-full items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-[#e8a34a]/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#e8a34a]">
                  {activeLightboxFrame.number}
                </span>
                <h4 className="font-sans text-sm font-medium text-[#f5ede2]">
                  {activeLightboxFrame.title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {effectiveVideoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = lightboxVideoRef.current;
                      if (!v) return;
                      v.muted = !v.muted;
                      setIsLightboxMuted(v.muted);
                    }}
                    className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    title={isLightboxMuted ? "Unmute audio" : "Mute audio"}
                  >
                    {isLightboxMuted ? (
                      <VolumeX className="size-4" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseLightbox}
                  className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Lecteur vidéo ou image haute résolution */}
            <div className="relative aspect-[16/10] w-full max-h-[70vh] overflow-hidden rounded bg-black flex items-center justify-center">
              {effectiveVideoUrl ? (
                <video
                  ref={lightboxVideoRef}
                  src={effectiveVideoUrl}
                  controls={false}
                  playsInline
                  autoPlay
                  muted={isLightboxMuted}
                  onTimeUpdate={() => {
                    const v = lightboxVideoRef.current;
                    if (v) setLightboxCurrentTime(v.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    const v = lightboxVideoRef.current;
                    if (v) setLightboxDuration(v.duration);
                  }}
                  onEnded={() => setIsLightboxPlaying(false)}
                  className="filmstrip-lightbox-video size-full object-contain"
                />
              ) : (
                <SafeImage
                  src={activeLightboxFrame.url}
                  alt={activeLightboxFrame.title || "Photograph from contact sheet"}
                  fill
                  unoptimized
                  className="object-contain"
                />
              )}
            </div>

            {/* Barre de contrôle vidéo dans la Lightbox */}
            {effectiveVideoUrl && (
              <div className="mt-3 flex w-full items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const v = lightboxVideoRef.current;
                    if (!v) return;
                    if (v.paused) {
                      void v.play();
                      setIsLightboxPlaying(true);
                    } else {
                      v.pause();
                      setIsLightboxPlaying(false);
                    }
                  }}
                  className="flex size-8 items-center justify-center rounded-full bg-[#e8a34a] text-black hover:bg-amber-400 transition-colors"
                >
                  {isLightboxPlaying ? (
                    <Pause className="size-3.5 fill-black" />
                  ) : (
                    <Play className="size-3.5 fill-black ml-0.5" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={lightboxDuration || 1}
                  step={0.05}
                  value={lightboxCurrentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLightboxCurrentTime(val);
                    if (lightboxVideoRef.current) {
                      lightboxVideoRef.current.currentTime = val;
                    }
                  }}
                  className="h-1.5 flex-1 cursor-pointer accent-[#e8a34a]"
                />

                <span className="font-mono text-[10px] text-white/50">
                  {lightboxCurrentTime.toFixed(1)}s / {lightboxDuration.toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Individual Film Strip Frame with Dynamic Hover Loop ─────────────────────
function FilmStripFrameCell({
  frame,
  index,
  effectiveVideoUrl,
  isTouchDevice,
  reducedMotion,
  onOpenLightbox,
}: {
  frame: FilmPhoto;
  index: number;
  effectiveVideoUrl?: string;
  isTouchDevice: boolean;
  reducedMotion: boolean;
  onOpenLightbox: (frame: FilmPhoto) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rot = ROTATION_PATTERNS[index % ROTATION_PATTERNS.length];

  const handleMouseEnter = () => {
    if (isTouchDevice || reducedMotion || !effectiveVideoUrl) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVideoLoaded(false);
  };

  // When hovered, loop ~1.5s around frame.timestamp
  useEffect(() => {
    if (!isHovered || !effectiveVideoUrl || !videoRef.current) return;
    const video = videoRef.current;
    const baseTime = frame.timestamp ?? 0;
    const start = Math.max(0, baseTime - 0.75);
    const end = start + 1.5;

    video.currentTime = start;

    const onTimeUpdate = () => {
      if (video.currentTime >= end || video.currentTime < start) {
        video.currentTime = start;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setVideoLoaded(true))
        .catch(() => {});
    }

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.pause();
    };
  }, [isHovered, effectiveVideoUrl, frame.timestamp]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir le tirage ${frame.number || frame.title}`}
      onClick={() => onOpenLightbox(frame)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenLightbox(frame);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="portfolio-film-frame group relative flex flex-col cursor-pointer rounded-[2px] bg-[#0c0807] px-3 py-2.5 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:z-30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(232,163,74,0.18)] focus:scale-[1.03] focus:outline-hidden focus:ring-2 focus:ring-[#e8a34a]"
      style={{
        width: "250px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        transform: `rotateZ(${rot}deg)`,
      }}
    >
      {/* Perforations supérieures (8 trous avec biseau subtil) */}
      <div className="mb-2 flex justify-between px-1" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 w-1.5 rounded-[1.5px] bg-[#060403]"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
            }}
          />
        ))}
      </div>

      {/* Numéro de vue et marquage SAFETY FILM */}
      <div className="mb-1 flex items-center justify-between font-mono text-[8px] text-[#cfc2b4]/60">
        <span className="font-semibold text-[#e8a34a]/80">{frame.number}</span>
        <span className="tracking-[0.25em]">SAFETY FILM</span>
        <span>▷</span>
      </div>

      {/* Cadre de l'image (ratio 3:2 argentique) */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[1.5px] bg-black">
        {/* Photo statique */}
        <SafeImage
          src={frame.url}
          alt={frame.title || "Photograph from contact sheet"}
          fill
          unoptimized
          sizes="250px"
          className="object-cover filter contrast-[1.08] sepia-[0.10] transition-transform duration-700 group-hover:scale-105 group-hover:sepia-0"
        />

        {/* Video active preview during hover (animated ~1.5s loop) */}
        {isHovered && effectiveVideoUrl && (
          <video
            ref={videoRef}
            src={effectiveVideoUrl}
            preload="metadata"
            muted
            playsInline
            className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
              videoLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Lueur de survol subtile */}
        <div className="absolute inset-0 bg-[#e8a34a]/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        {/* Indicateur de loop vidéo au survol */}
        {effectiveVideoUrl && (
          <div
            className={`absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[8px] text-[#e8a34a] backdrop-blur-xs transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-75"
            }`}
          >
            <Play className="size-2 fill-[#e8a34a]" />
            <span>{frame.timestamp ? `${frame.timestamp.toFixed(1)}s` : "1.5s"}</span>
          </div>
        )}

        {/* Légende au bas du tirage */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
          <p className="truncate font-sans text-[11px] font-medium text-[#f5ede2]">
            {frame.title}
          </p>
        </div>
      </div>

      {/* Marquage inférieur KODAK / TRI-X 400 */}
      <div className="mt-1 flex items-center justify-between font-mono text-[8px] text-[#cfc2b4]/60">
        <span className="tracking-wider">KODAK</span>
        <span className="text-[#e8a34a]/70">TRI-X 400</span>
        <span className="font-semibold text-[#e8a34a]/80">{frame.number}</span>
      </div>

      {/* Perforations inférieures (8 trous) */}
      <div className="mt-2 flex justify-between px-1" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 w-1.5 rounded-[1.5px] bg-[#060403]"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
