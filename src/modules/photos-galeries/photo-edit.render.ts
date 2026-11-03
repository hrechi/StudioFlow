/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import {
  FULL_CROP,
  resolveLook,
  type EditState,
  type Geometry,
  type ResolvedLook,
  type TextLayer,
} from "./photo-edit";

/**
 * Photo Editing page: draws an edit on a canvas, in the browser (free, nothing leaves the device
 * until the photographer saves). The same code renders the live preview and the final file, so
 * what is seen is what is saved. Order: rotate and crop, then colors and effects, then text.
 */

/** Size of the image after rotation (a quarter turn swaps width and height). */
export function rotatedSize(w: number, h: number, quarterTurns: number) {
  return quarterTurns % 2 === 0 ? { w, h } : { w: h, h: w };
}

/** Size of the final image for a source of w × h. */
export function outputSize(w: number, h: number, geometry: Geometry, crop = geometry.crop) {
  const rotated = rotatedSize(w, h, geometry.quarterTurns);
  return {
    w: Math.max(1, Math.round(rotated.w * crop.w)),
    h: Math.max(1, Math.round(rotated.h * crop.h)),
  };
}

function drawGeometry(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  w: number,
  h: number,
  geometry: Geometry,
  crop: { x: number; y: number; w: number; h: number },
) {
  const rotated = rotatedSize(w, h, geometry.quarterTurns);
  const angle = (geometry.straighten * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  // Straightening zooms in just enough to leave no empty corners.
  const zoom = Math.max(
    cos + (rotated.h / rotated.w) * sin,
    cos + (rotated.w / rotated.h) * sin,
  );
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.translate(-crop.x * rotated.w, -crop.y * rotated.h);
  ctx.translate(rotated.w / 2, rotated.h / 2);
  ctx.rotate((geometry.quarterTurns * Math.PI) / 2 + angle);
  ctx.scale((geometry.flipH ? -1 : 1) * zoom, (geometry.flipV ? -1 : 1) * zoom);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.restore();
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Tone curve of one channel, as a table: the fastest way to run it on millions of pixels. */
function buildCurve(look: ResolvedLook, gain: number): Uint8ClampedArray {
  const a = look.adjust;
  const exposure = 2 ** ((a.exposure / 100) * 1.5); // ±1.5 stops
  const contrast = 1 + (a.contrast / 100) * (a.contrast > 0 ? 0.9 : 0.6);
  const shadows = (a.shadows / 100) * 0.3;
  const highlights = (a.highlights / 100) * 0.3;
  const fade = look.fade * 0.14;
  const curve = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = clamp01((i / 255) * exposure);
    v += shadows * 4 * v * (1 - v) * (1 - v);
    v += highlights * 4 * v * v * (1 - v);
    v = (clamp01(v) - 0.5) * contrast + 0.5;
    v = fade + clamp01(v) * (1 - fade);
    curve[i] = clamp01(v * gain) * 255;
  }
  return curve;
}

function sharpenPixels(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  const src = data.slice();
  const k = (amount / 100) * 0.5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p = i + c;
        data[p] =
          src[p] + k * (4 * src[p] - src[p - 4] - src[p + 4] - src[p - w * 4] - src[p + w * 4]);
      }
    }
  }
}

/** Colors and effects. Changes `data` in place. */
export function applyLook(data: Uint8ClampedArray, w: number, h: number, look: ResolvedLook) {
  const a = look.adjust;
  const t = a.temperature / 100;
  const tint = a.tint / 100;
  const curveR = buildCurve(look, 1 + t * 0.18 + tint * 0.06);
  const curveG = buildCurve(look, 1 - tint * 0.12);
  const curveB = buildCurve(look, 1 - t * 0.18 + tint * 0.06);

  const saturation = 1 + a.saturation / 100;
  const vibrance = a.vibrance / 100;
  const { mono, sepia } = look;
  const colorWork = saturation !== 1 || vibrance !== 0 || mono > 0 || sepia > 0;

  const vignette = a.vignette / 100;
  const grain = (a.grain / 100) * 50;
  const cx = (w - 1) / 2 || 1;
  const cy = (h - 1) / 2 || 1;
  let seed = 0x2f6e2b1; // fixed, so the grain does not flicker while a slider moves

  for (let y = 0, i = 0; y < h; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < w; x++, i += 4) {
      let r = curveR[data[i]];
      let g = curveG[data[i + 1]];
      let b = curveB[data[i + 2]];

      if (colorWork) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        // Vibrance favours the muted colors, so skin and already vivid colors move less.
        const s = saturation + vibrance * (1 - chroma);
        r = l + (r - l) * s;
        g = l + (g - l) * s;
        b = l + (b - l) * s;
        if (mono > 0) {
          r += (l - r) * mono;
          g += (l - g) * mono;
          b += (l - b) * mono;
        }
        if (sepia > 0) {
          const sr = 0.393 * r + 0.769 * g + 0.189 * b;
          const sg = 0.349 * r + 0.686 * g + 0.168 * b;
          const sb = 0.272 * r + 0.534 * g + 0.131 * b;
          r += (sr - r) * sepia;
          g += (sg - g) * sepia;
          b += (sb - b) * sepia;
        }
      }

      if (vignette !== 0) {
        const dx = (x - cx) / cx;
        const d = clamp01(((dx * dx + dy * dy) / 2 - 0.2) / 0.8);
        const edge = d * d * (3 - 2 * d);
        const factor = vignette > 0 ? 1 - vignette * edge * 0.8 : 1 - vignette * edge * 0.5;
        r *= factor;
        g *= factor;
        b *= factor;
      }

      if (grain > 0) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        const noise = ((seed >>> 0) / 4294967295 - 0.5) * grain;
        r += noise;
        g += noise;
        b += noise;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  if (a.sharpen > 0) sharpenPixels(data, w, h, a.sharpen);
}

function isNeutralLook(look: ResolvedLook): boolean {
  return (
    look.mono === 0 &&
    look.sepia === 0 &&
    look.fade === 0 &&
    Object.values(look.adjust).every((v) => v === 0)
  );
}

export function textFont(layer: TextLayer, imageHeight: number): string {
  return `600 ${Math.max(1, (layer.size / 100) * imageHeight)}px ${layer.font}`;
}

function drawTexts(ctx: CanvasRenderingContext2D, w: number, h: number, texts: TextLayer[]) {
  for (const layer of texts) {
    if (!layer.text.trim()) continue;
    ctx.save();
    ctx.font = textFont(layer, h);
    ctx.fillStyle = layer.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(layer.text, layer.x * w, layer.y * h);
    ctx.restore();
  }
}

export type RenderOptions = {
  /** false: the whole image, for the crop tool. */
  applyCrop?: boolean;
  /** false: the unedited colors and no text, for "compare with the original". */
  applyEdits?: boolean;
};

/** Draws an edit of `source` (w × h, already at the wanted scale) on `canvas`. */
export function renderEdit(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  w: number,
  h: number,
  state: EditState,
  { applyCrop = true, applyEdits = true }: RenderOptions = {},
) {
  const crop = applyCrop ? state.geometry.crop : FULL_CROP;
  const size = outputSize(w, h, state.geometry, crop);
  if (canvas.width !== size.w) canvas.width = size.w;
  if (canvas.height !== size.h) canvas.height = size.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.clearRect(0, 0, size.w, size.h);
  drawGeometry(ctx, source, w, h, state.geometry, crop);
  if (!applyEdits) return;
  const look = resolveLook(state);
  if (!isNeutralLook(look)) {
    const pixels = ctx.getImageData(0, 0, size.w, size.h);
    applyLook(pixels.data, size.w, size.h, look);
    ctx.putImageData(pixels, 0, 0);
  }
  if (applyCrop) drawTexts(ctx, size.w, size.h, state.texts);
}

const EXPORT_MAX_SIDE = 6000;
const EXPORT_QUALITIES = [0.92, 0.85, 0.75, 0.6];

/** The final JPEG: full resolution (capped), lower quality only if needed to fit `maxBytes`. */
export async function exportEdit(
  image: HTMLImageElement,
  state: EditState,
  maxBytes: number,
): Promise<Blob> {
  const scale = Math.min(1, EXPORT_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  renderEdit(
    canvas,
    image,
    Math.round(image.naturalWidth * scale),
    Math.round(image.naturalHeight * scale),
    state,
  );
  let blob: Blob | null = null;
  for (const quality of EXPORT_QUALITIES) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) return blob;
  }
  if (!blob) throw new Error("The image could not be exported.");
  throw new Error("The edited photo is too large to save, even at lower quality.");
}
