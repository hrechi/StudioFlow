/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */

/**
 * Photo Editing page: the editor's settings, slider ranges and filter presets.
 * Pure data, shared by the browser (photo-edit.render.ts) and the server (Claude's suggestions).
 */

export const ADJUST_CONTROLS = [
  { key: "exposure", label: "Exposure", group: "Light", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", group: "Light", min: -100, max: 100 },
  { key: "highlights", label: "Highlights", group: "Light", min: -100, max: 100 },
  { key: "shadows", label: "Shadows", group: "Light", min: -100, max: 100 },
  { key: "whites", label: "Whites", group: "Light", min: -100, max: 100 },
  { key: "blacks", label: "Blacks", group: "Light", min: -100, max: 100 },
  { key: "temperature", label: "Temperature", group: "Color", min: -100, max: 100 },
  { key: "tint", label: "Tint", group: "Color", min: -100, max: 100 },
  { key: "hue", label: "Hue", group: "Color", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", group: "Color", min: -100, max: 100 },
  { key: "vibrance", label: "Vibrance", group: "Color", min: -100, max: 100 },
  { key: "clarity", label: "Clarity", group: "Detail", min: -100, max: 100 },
  { key: "dehaze", label: "Dehaze", group: "Detail", min: -100, max: 100 },
  { key: "sharpen", label: "Sharpen", group: "Detail", min: 0, max: 100 },
  { key: "noise", label: "Noise reduction", group: "Detail", min: 0, max: 100 },
  { key: "blur", label: "Blur", group: "Detail", min: 0, max: 100 },
  { key: "vignette", label: "Vignette", group: "Effects", min: -100, max: 100 },
  { key: "grain", label: "Grain", group: "Effects", min: 0, max: 100 },
] as const;

export type AdjustKey = (typeof ADJUST_CONTROLS)[number]["key"];
export type Adjustments = Record<AdjustKey, number>;

export function neutralAdjustments(): Adjustments {
  return Object.fromEntries(ADJUST_CONTROLS.map((c) => [c.key, 0])) as Adjustments;
}

export function clampAdjustment(key: AdjustKey, value: number): number {
  const control = ADJUST_CONTROLS.find((c) => c.key === key);
  if (!control || !Number.isFinite(value)) return 0;
  return Math.max(control.min, Math.min(control.max, Math.round(value)));
}

export type FilterPreset = {
  id: string;
  label: string;
  adjust: Partial<Adjustments>;
  mono?: number; // 0–1: black and white
  sepia?: number; // 0–1
  fade?: number; // 0–1: lifted blacks
};

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "bw", label: "B&W", adjust: { contrast: 12 }, mono: 1 },
  { id: "noir", label: "Noir", adjust: { contrast: 45, exposure: -8, vignette: 35 }, mono: 1 },
  { id: "sepia", label: "Sepia", adjust: { contrast: 5 }, sepia: 0.9 },
  {
    id: "vintage",
    label: "Vintage",
    adjust: { temperature: 18, saturation: -18, contrast: -8, grain: 18, vignette: 22 },
    sepia: 0.15,
    fade: 0.5,
  },
  { id: "warm", label: "Warm", adjust: { temperature: 28, vibrance: 10, exposure: 3 } },
  { id: "cool", label: "Cool", adjust: { temperature: -28, tint: -4, contrast: 5 } },
  { id: "fade", label: "Fade", adjust: { contrast: -18, saturation: -12, exposure: 5 }, fade: 0.9 },
  {
    id: "cinematic",
    label: "Cinematic",
    adjust: { contrast: 22, temperature: -8, saturation: -10, shadows: -12, vignette: 25 },
  },
  { id: "matte", label: "Matte", adjust: { contrast: -10, saturation: -6, shadows: 12 }, fade: 0.65 },
  { id: "vivid", label: "Vivid", adjust: { contrast: 14, saturation: 18, vibrance: 28 } },
];

export function filterPreset(id: string | null): FilterPreset | undefined {
  return FILTER_PRESETS.find((f) => f.id === id);
}

/** Crop in fractions (0–1) of the rotated image. */
export type CropRect = { x: number; y: number; w: number; h: number };
export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export type Geometry = {
  quarterTurns: number; // 0–3, clockwise
  flipH: boolean;
  flipV: boolean;
  straighten: number; // degrees, -15 to 15
  crop: CropRect;
};

export const TEXT_FONTS = [
  { value: "Georgia, serif", label: "Serif" },
  { value: "Arial, Helvetica, sans-serif", label: "Sans" },
  { value: "'Courier New', monospace", label: "Mono" },
] as const;

export type TextLayer = {
  id: string;
  text: string;
  x: number; // centre, 0–1 of the final image
  y: number;
  size: number; // % of the final image height
  color: string;
  font: string;
};

// ── Color mixer (Photoshop Hue/Saturation by range) ─────────────────────────

/** The eight color ranges, with the hue (degrees) each one is centred on. */
export const HSL_BANDS = [
  { key: "red", label: "Reds", hue: 0, swatch: "#e5484d" },
  { key: "orange", label: "Oranges", hue: 30, swatch: "#f76b15" },
  { key: "yellow", label: "Yellows", hue: 60, swatch: "#ffc53d" },
  { key: "green", label: "Greens", hue: 120, swatch: "#46a758" },
  { key: "aqua", label: "Aquas", hue: 180, swatch: "#12a594" },
  { key: "blue", label: "Blues", hue: 240, swatch: "#3e63dd" },
  { key: "purple", label: "Purples", hue: 280, swatch: "#8e4ec6" },
  { key: "magenta", label: "Magentas", hue: 320, swatch: "#d6409f" },
] as const;

export type HslBand = (typeof HSL_BANDS)[number]["key"];
/** Each value -100 to 100: hue shift, saturation, luminance of that range. */
export type HslValues = { h: number; s: number; l: number };
export type HslMix = Record<HslBand, HslValues>;

export function neutralHsl(): HslMix {
  return Object.fromEntries(HSL_BANDS.map((b) => [b.key, { h: 0, s: 0, l: 0 }])) as HslMix;
}

// ── Color balance (Photoshop Color Balance) ─────────────────────────────────

export const TONE_RANGES = [
  { key: "shadows", label: "Shadows" },
  { key: "midtones", label: "Midtones" },
  { key: "highlights", label: "Highlights" },
] as const;

export type ToneRange = (typeof TONE_RANGES)[number]["key"];
/** Each axis -100 to 100: cyan ↔ red, magenta ↔ green, yellow ↔ blue. */
export type BalanceValues = { cr: number; mg: number; yb: number };
export type ColorBalance = Record<ToneRange, BalanceValues>;

export const BALANCE_AXES = [
  { key: "cr", from: "Cyan", to: "Red", fromColor: "#00b7c3", toColor: "#e5484d" },
  { key: "mg", from: "Magenta", to: "Green", fromColor: "#d6409f", toColor: "#46a758" },
  { key: "yb", from: "Yellow", to: "Blue", fromColor: "#ffc53d", toColor: "#3e63dd" },
] as const;

export function neutralBalance(): ColorBalance {
  return Object.fromEntries(
    TONE_RANGES.map((r) => [r.key, { cr: 0, mg: 0, yb: 0 }]),
  ) as ColorBalance;
}

export type EditState = {
  adjust: Adjustments;
  filter: { id: string | null; intensity: number }; // intensity 0–100
  hsl: HslMix;
  balance: ColorBalance;
  geometry: Geometry;
  texts: TextLayer[];
};

export function neutralGeometry(): Geometry {
  return { quarterTurns: 0, flipH: false, flipV: false, straighten: 0, crop: FULL_CROP };
}

export function neutralEditState(): EditState {
  return {
    adjust: neutralAdjustments(),
    filter: { id: null, intensity: 100 },
    hsl: neutralHsl(),
    balance: neutralBalance(),
    geometry: neutralGeometry(),
    texts: [],
  };
}

/** What "Apply to photos…" copies: the look always, crop/rotation and text only if asked. */
export function editForOtherPhoto(
  state: EditState,
  { geometry, texts }: { geometry: boolean; texts: boolean },
): EditState {
  return {
    ...state,
    geometry: geometry ? state.geometry : neutralGeometry(),
    texts: texts ? state.texts : [],
  };
}

/** The values the pixel pipeline uses: the sliders plus the preset at its intensity. */
export type ResolvedLook = {
  adjust: Adjustments;
  mono: number;
  sepia: number;
  fade: number;
  hsl: HslMix;
  balance: ColorBalance;
};

export function resolveLook(
  state: Pick<EditState, "adjust" | "filter"> & Partial<Pick<EditState, "hsl" | "balance">>,
): ResolvedLook {
  const preset = filterPreset(state.filter.id);
  const strength = preset ? state.filter.intensity / 100 : 0;
  const adjust = { ...state.adjust };
  if (preset) {
    for (const { key } of ADJUST_CONTROLS) {
      adjust[key] = clampAdjustment(key, adjust[key] + (preset.adjust[key] ?? 0) * strength);
    }
  }
  return {
    adjust,
    mono: (preset?.mono ?? 0) * strength,
    sepia: (preset?.sepia ?? 0) * strength,
    fade: (preset?.fade ?? 0) * strength,
    hsl: state.hsl ?? neutralHsl(),
    balance: state.balance ?? neutralBalance(),
  };
}
