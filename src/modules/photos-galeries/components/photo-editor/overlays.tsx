"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { CropRect, TextLayer } from "../../photo-edit";

type Corner = "nw" | "ne" | "sw" | "se";
type DragMode = Corner | "move";

const MIN_SIZE = 0.05;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** New crop after dragging by (dx, dy), in fractions of the image; `ratio` is width / height in those fractions. */
function dragCrop(
  crop: CropRect,
  mode: DragMode,
  dx: number,
  dy: number,
  ratio: number | null,
): CropRect {
  if (mode === "move") {
    return {
      ...crop,
      x: clamp(crop.x + dx, 0, 1 - crop.w),
      y: clamp(crop.y + dy, 0, 1 - crop.h),
    };
  }
  // The opposite corner stays where it is.
  const fromLeft = mode === "nw" || mode === "sw";
  const fromTop = mode === "nw" || mode === "ne";
  const anchorX = fromLeft ? crop.x + crop.w : crop.x;
  const anchorY = fromTop ? crop.y + crop.h : crop.y;
  const maxW = fromLeft ? anchorX : 1 - anchorX;
  const maxH = fromTop ? anchorY : 1 - anchorY;
  let w = clamp(crop.w + (fromLeft ? -dx : dx), MIN_SIZE, maxW);
  let h = clamp(crop.h + (fromTop ? -dy : dy), MIN_SIZE, maxH);
  if (ratio) {
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
  }
  return { x: fromLeft ? anchorX - w : anchorX, y: fromTop ? anchorY - h : anchorY, w, h };
}

const CORNERS: { mode: Corner; className: string }[] = [
  { mode: "nw", className: "top-0 left-0 cursor-nwse-resize" },
  { mode: "ne", className: "top-0 right-0 cursor-nesw-resize" },
  { mode: "sw", className: "bottom-0 left-0 cursor-nesw-resize" },
  { mode: "se", className: "right-0 bottom-0 cursor-nwse-resize" },
];

/** Draggable crop box over the whole image. Works by mouse and by touch (pointer events). */
export function CropOverlay({
  crop,
  ratio,
  imageAspect,
  onChange,
  onCommit,
}: {
  crop: CropRect;
  ratio: number | null; // wanted width / height in pixels
  imageAspect: number; // width / height of the whole image
  onChange: (crop: CropRect) => void;
  onCommit: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; x: number; y: number; crop: CropRect } | null>(null);

  const start = (mode: DragMode, event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, x: event.clientX, y: event.clientY, crop };
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const box = container.current?.getBoundingClientRect();
    if (!drag.current || !box) return;
    onChange(
      dragCrop(
        drag.current.crop,
        drag.current.mode,
        (event.clientX - drag.current.x) / box.width,
        (event.clientY - drag.current.y) / box.height,
        ratio ? ratio / imageAspect : null,
      ),
    );
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    onCommit();
  };

  return (
    <div ref={container} className="absolute inset-0 overflow-hidden">
      <div
        role="group"
        aria-label="Crop area: drag to move, drag a corner to resize"
        className="absolute cursor-move touch-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-1 ring-white"
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`,
          height: `${crop.h * 100}%`,
        }}
        onPointerDown={(event) => start("move", event)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {/* Rule of thirds */}
        <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/40" />
        <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/40" />
        <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/40" />
        <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/40" />
        {CORNERS.map(({ mode, className }) => (
          <span
            key={mode}
            data-corner={mode}
            className={cn(
              "absolute size-5 touch-none rounded-sm bg-white shadow ring-1 ring-black/40",
              className,
            )}
            onPointerDown={(event) => start(mode, event)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        ))}
      </div>
    </div>
  );
}

/** Drag handles over the text layers; the text itself is drawn on the canvas. */
export function TextOverlay({
  texts,
  selected,
  displayHeight,
  onSelect,
  onMove,
  onCommit,
}: {
  texts: TextLayer[];
  selected: string | null;
  displayHeight: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onCommit: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const start = (layer: TextLayer, event: ReactPointerEvent<HTMLElement>) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(layer.id);
    drag.current = {
      id: layer.id,
      dx: (event.clientX - box.left) / box.width - layer.x,
      dy: (event.clientY - box.top) / box.height - layer.y,
    };
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const box = container.current?.getBoundingClientRect();
    if (!drag.current || !box) return;
    onMove(
      drag.current.id,
      clamp((event.clientX - box.left) / box.width - drag.current.dx, 0, 1),
      clamp((event.clientY - box.top) / box.height - drag.current.dy, 0, 1),
    );
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    onCommit();
  };

  return (
    <div ref={container} className="absolute inset-0 overflow-hidden">
      {texts
        .filter((layer) => layer.text.trim())
        .map((layer) => (
          <span
            key={layer.id}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded-sm px-1 whitespace-nowrap text-transparent outline-1 outline-white/70 select-none outline-dashed",
              selected === layer.id && "outline-2 outline-white",
            )}
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              font: `600 ${(layer.size / 100) * displayHeight}px ${layer.font}`,
            }}
            onPointerDown={(event) => start(layer, event)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            {layer.text}
          </span>
        ))}
    </div>
  );
}

/**
 * Before / after: the original on the left of the divider, the edit on the right. Drag anywhere
 * on the photo (or use the arrow keys on the handle) to move the divider.
 */
export function SplitOverlay({
  position,
  onChange,
}: {
  position: number; // 0–1 from the left
  onChange: (position: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  const moveTo = (event: ReactPointerEvent) => {
    const box = container.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    onChange(clamp((event.clientX - box.left) / box.width, 0, 1));
  };

  return (
    <div
      ref={container}
      className="absolute inset-0 cursor-ew-resize touch-none select-none"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event);
      }}
    >
      <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
        Before
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
        After
      </span>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        style={{ left: `${position * 100}%` }}
      >
        <button
          type="button"
          role="slider"
          aria-label="Before and after divider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position * 100)}
          className="pointer-events-auto absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.02;
            if (event.key === "ArrowLeft") onChange(clamp(position - step, 0, 1));
            else if (event.key === "ArrowRight") onChange(clamp(position + step, 0, 1));
            else return;
            event.preventDefault();
          }}
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
