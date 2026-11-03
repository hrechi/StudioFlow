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
  { key: "temperature", label: "Temperature", group: "Color", min: -100, max: 100 },
  { key: "tint", label: "Tint", group: "Color", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", group: "Color", min: -100, max: 100 },
  { key: "vibrance", label: "Vibrance", group: "Color", min: -100, max: 100 },
  { key: "sharpen", label: "Sharpen", group: "Effects", min: 0, max: 100 },
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

export type EditState = {
  adjust: Adjustments;
  filter: { id: string | null; intensity: number }; // intensity 0–100
  geometry: Geometry;
  texts: TextLayer[];
};

export function neutralEditState(): EditState {
  return {
    adjust: neutralAdjustments(),
    filter: { id: null, intensity: 100 },
    geometry: { quarterTurns: 0, flipH: false, flipV: false, straighten: 0, crop: FULL_CROP },
    texts: [],
  };
}

/** The values the pixel pipeline uses: the sliders plus the preset at its intensity. */
export type ResolvedLook = { adjust: Adjustments; mono: number; sepia: number; fade: number };

export function resolveLook(state: Pick<EditState, "adjust" | "filter">): ResolvedLook {
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
  };
}
