/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import {
  FULL_CROP,
  HSL_BANDS,
  resolveLook,
  type ColorBalance,
  type EditState,
  type Geometry,
  type HslMix,
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
  // Whites and blacks move the end points, like the input sliders of Levels.
  const black = -(a.blacks / 100) * 0.12;
  const white = 1 - (a.whites / 100) * 0.12;
  const fade = look.fade * 0.14;
  const curve = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = clamp01((i / 255) * exposure);
    v = clamp01((v - black) / (white - black));
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

/**
 * Box blur in place, `passes` times (3 passes look like a Gaussian blur). Works on `channels`
 * interleaved channels every `stride` bytes, with one line of extra memory, so it also runs
 * on a full-resolution export.
 */
function boxBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  stride: number,
  channels: number,
  passes: number,
) {
  const r = Math.round(radius);
  if (r < 1) return;
  const line = new Float32Array(Math.max(w, h));
  const div = 2 * r + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let c = 0; c < channels; c++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) line[x] = data[(row + x) * stride + c];
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += line[k < 0 ? 0 : k >= w ? w - 1 : k];
        for (let x = 0; x < w; x++) {
          data[(row + x) * stride + c] = sum / div;
          sum += line[x + r + 1 < w ? x + r + 1 : w - 1] - line[x - r > 0 ? x - r : 0];
        }
      }
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) line[y] = data[(y * w + x) * stride + c];
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += line[k < 0 ? 0 : k >= h ? h - 1 : k];
        for (let y = 0; y < h; y++) {
          data[(y * w + x) * stride + c] = sum / div;
          sum += line[y + r + 1 < h ? y + r + 1 : h - 1] - line[y - r > 0 ? y - r : 0];
        }
      }
    }
  }
}

/** Hue rotation matrix (the one CSS hue-rotate uses): turns every color, keeps luminance. */
function hueMatrix(degrees: number): number[] {
  const angle = (degrees * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.14,
    0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072,
  ];
}

/** The color mixer as three 360° tables, blended between neighbouring ranges. */
function buildMixer(hsl: HslMix) {
  const dh = new Float32Array(360);
  const ds = new Float32Array(360);
  const dl = new Float32Array(360);
  for (let deg = 0; deg < 360; deg++) {
    let i = HSL_BANDS.length - 1;
    while (i > 0 && HSL_BANDS[i].hue > deg) i--;
    const from = HSL_BANDS[i];
    const to = HSL_BANDS[(i + 1) % HSL_BANDS.length];
    const span = (to.hue - from.hue + 360) % 360 || 360;
    const t = ((deg - from.hue + 360) % 360) / span;
    const a = hsl[from.key];
    const b = hsl[to.key];
    dh[deg] = ((a.h + (b.h - a.h) * t) / 100) * 30; // ±30°
    ds[deg] = (a.s + (b.s - a.s) * t) / 100;
    dl[deg] = (a.l + (b.l - a.l) * t) / 100;
  }
  return { dh, ds, dl };
}

function isNeutralMix(hsl: HslMix): boolean {
  return Object.values(hsl).every((v) => v.h === 0 && v.s === 0 && v.l === 0);
}

function isNeutralBalance(balance: ColorBalance): boolean {
  return Object.values(balance).every((v) => v.cr === 0 && v.mg === 0 && v.yb === 0);
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
  const hue = a.hue !== 0 ? hueMatrix((a.hue / 100) * 180) : null;
  const mixer = isNeutralMix(look.hsl) ? null : buildMixer(look.hsl);
  const bal = isNeutralBalance(look.balance) ? null : look.balance;
  const BALANCE_GAIN = 0.75; // 100 on an axis moves that channel by about 30 %
  const dehaze = a.dehaze / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = curveR[data[i]];
    let g = curveG[data[i + 1]];
    let b = curveB[data[i + 2]];

    if (hue) {
      const r0 = r;
      const g0 = g;
      r = hue[0] * r0 + hue[1] * g0 + hue[2] * b;
      g = hue[3] * r0 + hue[4] * g0 + hue[5] * b;
      b = hue[6] * r0 + hue[7] * g0 + hue[8] * b;
    }

    if (mixer) {
      // RGB → HSL, move this hue range, then back. Grays have no hue and stay as they are.
      const rn = clamp01(r / 255);
      const gn = clamp01(g / 255);
      const bn = clamp01(b / 255);
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const d = max - min;
      if (d > 0.0001) {
        let l = (max + min) / 2;
        let s = d / (1 - Math.abs(2 * l - 1));
        let hh =
          max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
        hh = (hh * 60 + 360) % 360;
        const k = Math.round(hh) % 360;
        hh = (hh + mixer.dh[k] + 360) % 360;
        s = clamp01(s * (1 + mixer.ds[k]));
        l = clamp01(l + mixer.dl[k] * 0.25 * s);
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
        const m = l - c / 2;
        const sector = Math.floor(hh / 60);
        // No array per pixel: this runs millions of times.
        let r1 = c; // sector 5: (c, 0, x)
        let g1 = 0;
        let b1 = x;
        if (sector === 0) {
          g1 = x;
          b1 = 0;
        } else if (sector === 1) {
          r1 = x;
          g1 = c;
          b1 = 0;
        } else if (sector === 2) {
          r1 = 0;
          g1 = c;
        } else if (sector === 3) {
          r1 = 0;
          g1 = x;
          b1 = c;
        } else if (sector === 4) {
          r1 = x;
          b1 = c;
        }
        r = (r1 + m) * 255;
        g = (g1 + m) * 255;
        b = (b1 + m) * 255;
      }
    }

    if (bal) {
      // Shadows, midtones and highlights each get their own push; luminosity is preserved.
      const l = clamp01((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
      const ws = (1 - l) * (1 - l);
      const wh = l * l;
      const wm = 1 - ws - wh;
      const dr = (bal.shadows.cr * ws + bal.midtones.cr * wm + bal.highlights.cr * wh) * BALANCE_GAIN;
      const dg = (bal.shadows.mg * ws + bal.midtones.mg * wm + bal.highlights.mg * wh) * BALANCE_GAIN;
      const db = (bal.shadows.yb * ws + bal.midtones.yb * wm + bal.highlights.yb * wh) * BALANCE_GAIN;
      const dl = 0.2126 * dr + 0.7152 * dg + 0.0722 * db;
      r += dr - dl;
      g += dg - dl;
      b += db - dl;
    }

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

    if (dehaze > 0) {
      // Removes the gray veil: each pixel loses part of its darkest channel, whites stay white.
      const veil = (dehaze * 0.6 * Math.max(0, Math.min(r, g, b, 255))) / 255;
      r = (r - 255 * veil) / (1 - veil);
      g = (g - 255 * veil) / (1 - veil);
      b = (b - 255 * veil) / (1 - veil);
    } else if (dehaze < 0) {
      const haze = -dehaze * 0.45;
      r += (215 - r) * haze;
      g += (215 - g) * haze;
      b += (215 - b) * haze;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // Neighbourhood effects. Their radius follows the image size, so the live preview (smaller)
  // and the saved file (full resolution) look the same.
  const scale = Math.max(w, h) / 1000;

  if (a.clarity !== 0) {
    // Local contrast: each pixel moves away from the average brightness around it, mostly in
    // the midtones, so skies and blacks do not get halos.
    const lum = new Uint8ClampedArray(w * h);
    for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
      lum[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const local = lum.slice();
    boxBlur(local, w, h, Math.max(2, 20 * scale), 1, 1, 2);
    const amount = (a.clarity / 100) * 1.2;
    for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
      const l = lum[p] / 255;
      const push = amount * (lum[p] - local[p]) * 4 * l * (1 - l);
      data[i] += push;
      data[i + 1] += push;
      data[i + 2] += push;
    }
  }

  if (a.noise > 0) {
    // Smooths flat areas towards their neighbours, but leaves edges (big differences) alone.
    const smooth = data.slice();
    boxBlur(smooth, w, h, Math.max(1, (1 + (a.noise / 100) * 2) * scale), 4, 3, 2);
    const strength = a.noise / 100;
    for (let i = 0; i < data.length; i += 4) {
      const diff =
        (Math.abs(data[i] - smooth[i]) +
          Math.abs(data[i + 1] - smooth[i + 1]) +
          Math.abs(data[i + 2] - smooth[i + 2])) /
        3;
      const weight = strength * (1 - Math.min(1, diff / 40));
      data[i] += (smooth[i] - data[i]) * weight;
      data[i + 1] += (smooth[i + 1] - data[i + 1]) * weight;
      data[i + 2] += (smooth[i + 2] - data[i + 2]) * weight;
    }
  }

  if (a.sharpen > 0) sharpenPixels(data, w, h, a.sharpen);
  if (a.blur > 0) boxBlur(data, w, h, (a.blur / 100) * 16 * scale, 4, 3, 3);

  const vignette = a.vignette / 100;
  const grain = (a.grain / 100) * 50;
  if (vignette === 0 && grain === 0) return;
  const cx = (w - 1) / 2 || 1;
  const cy = (h - 1) / 2 || 1;
  let seed = 0x2f6e2b1; // fixed, so the grain does not flicker while a slider moves
  for (let y = 0, i = 0; y < h; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < w; x++, i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
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
}

function isNeutralLook(look: ResolvedLook): boolean {
  return (
    look.mono === 0 &&
    look.sepia === 0 &&
    look.fade === 0 &&
    Object.values(look.adjust).every((v) => v === 0) &&
    isNeutralMix(look.hsl) &&
    isNeutralBalance(look.balance)
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
  /** false: the unedited colors and no text, for the "before" side of before / after. */
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
