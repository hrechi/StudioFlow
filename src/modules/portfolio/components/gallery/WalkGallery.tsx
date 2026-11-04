"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import type { ElementPortfolioPublic } from "../../portfolio.types";
import { useWalkGallery } from "./useWalkGallery";

// Natural museum wall variations for staggered height and slight organic rotation
const WALL_VARIATIONS = [
  { x: -18, y: -2, ry: 13, rz: -0.8 },
  { x: 18, y: 1.8, ry: -13, rz: 0.9 },
  { x: -18.5, y: 0.6, ry: 12.5, rz: -0.6 },
  { x: 17.5, y: -1.6, ry: -13.5, rz: 0.7 },
  { x: -18, y: 1.2, ry: 12, rz: -0.5 },
  { x: 18, y: -0.8, ry: -13, rz: 0.8 },
];

export function WalkGallery({
  id,
  elements,
  titre,
  sectionNumber = "02",
}: {
  id?: string;
  elements: ElementPortfolioPublic[];
  titre: string;
  sectionNumber?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardNavigating, setKeyboardNavigating] = useState(false);
  const [fullImage, setFullImage] = useState<ElementPortfolioPublic | null>(null);
  const keyboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const works = elements.slice(0, 12);
  useWalkGallery(rootRef, works.length, setActiveIndex);

  const displayTitle = (element?: ElementPortfolioPublic) =>
    element?.titre?.trim() || element?.legende?.trim() || "Photograph";

  const displaySubtitle = (element?: ElementPortfolioPublic) => {
    if (!element) return "PORTFOLIO";
    const cat = element.categorie?.trim();
    const leg = element.legende?.trim();
    const tit = element.titre?.trim();
    if (cat && leg && tit && leg !== tit) return `${cat} · ${leg}`;
    if (cat) return cat;
    if (leg && leg !== tit) return leg;
    return "PORTFOLIO";
  };

  const jumpTo = useCallback(
    (index: number) => {
      const root = rootRef.current;
      if (!root || works.length === 0) return;
      const next = Math.max(0, Math.min(works.length - 1, index));
      const rect = root.getBoundingClientRect();
      const runway = Math.max(1, root.offsetHeight - window.innerHeight);
      const lead = 0.55;
      const travel = works.length - 1;
      const exactProgress = travel === 0 ? 0 : (next + lead) / (travel + lead);
      window.scrollTo({
        top: window.scrollY + rect.top + runway * exactProgress,
        behavior: "smooth",
      });
    },
    [works.length],
  );

  useEffect(() => {
    if (!fullImage) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullImage(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [fullImage]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const markKeyboardNavigation = () => {
      setKeyboardNavigating(true);
      if (keyboardTimer.current) clearTimeout(keyboardTimer.current);
      keyboardTimer.current = setTimeout(() => setKeyboardNavigating(false), 1200);
    };

    const onKey = (event: KeyboardEvent) => {
      const rect = root.getBoundingClientRect();
      const pinned = rect.top <= 10 && rect.bottom >= window.innerHeight - 10;
      if (!pinned) return;

      if (event.key === "ArrowRight") {
        if (activeIndex < works.length - 1) {
          event.preventDefault();
          markKeyboardNavigation();
          jumpTo(activeIndex + 1);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        if (activeIndex > 0) {
          event.preventDefault();
          markKeyboardNavigation();
          jumpTo(activeIndex - 1);
        }
        return;
      }

      if (event.key === "Home") {
        if (activeIndex > 0) {
          event.preventDefault();
          markKeyboardNavigation();
          jumpTo(0);
        }
        return;
      }

      if (event.key === "End") {
        if (activeIndex < works.length - 1) {
          event.preventDefault();
          markKeyboardNavigation();
          jumpTo(works.length - 1);
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (keyboardTimer.current) clearTimeout(keyboardTimer.current);
    };
  }, [activeIndex, works.length, jumpTo]);

  if (works.length === 0) return null;

  const currentWork = works[activeIndex];
  const sectionLabel = `${sectionNumber.padStart(2, "0")} — ${titre ? titre.toUpperCase() : "THE WALL"}`;

  return (
    <section
      ref={rootRef}
      id={id}
      className="museum"
      aria-label={titre}
      style={{
        height: `calc(100svh + ${Math.max(1, works.length - 1) * 90}vh)`,
        scrollMarginTop: "54px",
      }}
    >
      <div className="museum-pin">
        {/* 1. L’arrière-plan en couloir — Image 3D fixe /images/dark_gallery_corridor_background_no_frames.png */}
        <SafeImage
          src="/images/dark_gallery_corridor_background_no_frames.png"
          alt=""
          fill
          unoptimized
          priority
          sizes="100vw"
          className="museum-plate"
        />

        {/* Vignette d'ambiance concentrant le regard au milieu */}
        <div className="museum-vignette" />

        <div className="hall">
          {/* 2. Le titre au centre — très atténué, traversé par les cadres */}
          <div className="intro">
            <span className="intro-label">{sectionLabel}</span>
            <h2 className="intro-title-bold">Walk the wall,</h2>
            <p className="intro-title-serif">
              print by print<span className="intro-dot">.</span>
            </p>
            <p className="intro-desc">
              {works.length} photographs arranged in the shadows. Scroll slowly — the corridor
              moves with you and each frame lights up as you pass.
            </p>
            <div className="intro-hint">
              <span>↓</span> SCROLL TO WALK
            </div>
          </div>

          {/* 3. Les cadres en 3D — décalés en hauteur et rotation */}
          {works.map((element, index) => {
            const v = WALL_VARIATIONS[index % WALL_VARIATIONS.length];
            const side = index % 2 === 0 ? "left" : "right";
            const itemNumber = String(index + 1).padStart(2, "0");
            const totalNumber = String(works.length).padStart(2, "0");
            const title = displayTitle(element);
            const subtitle = displaySubtitle(element);

            return (
              <article
                key={element.idElement}
                data-walk-work
                data-side={side}
                className="work"
                role="button"
                tabIndex={0}
                onClick={() => setFullImage(element)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFullImage(element);
                  }
                }}
                style={
                  {
                    "--x": `${v.x}vw`,
                    "--y": `${v.y}vh`,
                    "--ry": `${v.ry}deg`,
                    "--rz": `${v.rz}deg`,
                    "--z": "0px",
                    "--lit": "0",
                    "--op": "1",
                  } as CSSProperties
                }
              >
                {/* Lueur ambrée derrière le cadre actif */}
                <div className="work-glow" />

                {/* Double cadre brun + passe-partout crème */}
                <figure className="frame">
                  <div className="matting">
                    <SafeImage
                      src={element.media.urlMiniature || element.media.url}
                      alt={element.texteAlt || element.titre || titre}
                      fill
                      unoptimized
                      sizes="(max-width: 700px) 60vw, 360px"
                      className="image"
                    />
                  </div>
                </figure>

                {/* 4. La plaque de légende — légèrement inclinée sous le cadre */}
                <div className="cartouche">
                  <span className="cartouche-index">
                    {itemNumber} / {totalNumber}
                  </span>
                  <strong className="cartouche-title">{title}</strong>
                  <p className="cartouche-meta">{subtitle}</p>
                </div>
              </article>
            );
          })}

          {/* 5. La navigation en bas — pastille, ligne de contexte et raccourci */}
          <div
            className="hud"
            data-keyboard={keyboardNavigating ? "true" : "false"}
            aria-live="polite"
            onPointerDown={() => setKeyboardNavigating(false)}
          >
            {/* Pastille arrondie avec flèches et numéros */}
            <div className="hud-pill">
              <button
                type="button"
                aria-label="Previous photograph"
                className="hud-btn-nav"
                disabled={activeIndex === 0}
                onClick={() => jumpTo(activeIndex - 1)}
              >
                &lt;
              </button>

              {works.map((_, i) => {
                const isSelected = i === activeIndex;
                const numStr = String(i + 1).padStart(2, "0");
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Photograph ${numStr}`}
                    className={isSelected ? "hud-btn-active" : "hud-btn-num"}
                    onClick={() => jumpTo(i)}
                  >
                    {numStr}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Next photograph"
                className="hud-btn-nav"
                disabled={activeIndex === works.length - 1}
                onClick={() => jumpTo(activeIndex + 1)}
              >
                &gt;
              </button>
            </div>

            {/* Ligne de contexte */}
            <div className="hud-current">
              {String(activeIndex + 1).padStart(2, "0")} {displayTitle(currentWork).toUpperCase()} —{" "}
              {displaySubtitle(currentWork).toUpperCase()}
            </div>

            {/* Raccourci clavier */}
            <div className="hud-prompt">
              <kbd className="hud-keycap">←</kbd>
              <kbd className="hud-keycap">→</kbd>
              <span className="hud-prompt-text">TO WALK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox au clic */}
      {fullImage && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={fullImage.titre || "Expanded photograph"}
          onClick={() => setFullImage(null)}
        >
          <button type="button" aria-label="Close" className="lightbox-close">
            ×
          </button>
          <div className="lightbox-image" onClick={(event) => event.stopPropagation()}>
            <SafeImage
              src={fullImage.media.url || fullImage.media.urlMiniature}
              alt={fullImage.texteAlt || fullImage.titre || titre}
              fill
              unoptimized
              sizes="100vw"
              className="lightbox-photo"
            />
          </div>
        </div>
      )}
    </section>
  );
}
