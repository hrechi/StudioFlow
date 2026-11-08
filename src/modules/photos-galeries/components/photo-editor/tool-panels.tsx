"use client";

import {
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ADJUST_CONTROLS,
  BALANCE_AXES,
  FILTER_PRESETS,
  FULL_CROP,
  HSL_BANDS,
  TEXT_FONTS,
  TONE_RANGES,
  neutralAdjustments,
  neutralBalance,
  neutralEditState,
  neutralHsl,
  type EditState,
  type FilterPreset,
  type HslValues,
  type TextLayer,
  type ToneRange,
} from "../../photo-edit";
import { renderEdit, rotatedSize } from "../../photo-edit.render";
import { suggestPhotoEditAction } from "../../photo-ai.actions";
import type { LoadedPhoto } from "./photo-editor";

type Change = (change: (state: EditState) => EditState) => void;

function Slider({
  label,
  value,
  min,
  max,
  neutral = 0,
  track,
  onChange,
  onCommit,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  neutral?: number;
  /** A CSS gradient for the track, e.g. cyan → red on Color Balance. */
  track?: string;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate">{label}</span>
        <span className={cn("tabular-nums", value === neutral ? "text-muted-foreground" : "text-foreground")}>
          {value > 0 && min < 0 ? `+${value}` : value}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        // Double-click puts the slider back.
        onDoubleClick={() => {
          onChange(neutral);
          onCommit();
        }}
        className={cn(
          "h-5 w-full cursor-pointer accent-primary",
          track && "h-2 appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/30 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow",
        )}
        style={track ? { background: track } : undefined}
      />
    </label>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />;
}

// ── Color: mixer (Hue/Saturation by range) and Color Balance ────────────────

const MIX_MODES = [
  { key: "h", label: "Hue" },
  { key: "s", label: "Saturation" },
  { key: "l", label: "Luminance" },
] as const;

export function ColorPanel({
  state,
  update,
  commit,
  apply,
}: {
  state: EditState;
  update: Change;
  commit: () => void;
  apply: Change;
}) {
  const [mode, setMode] = useState<keyof HslValues>("h");
  const [range, setRange] = useState<ToneRange>("midtones");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Color mixer
        </h2>
        <div role="tablist" aria-label="Mixer channel" className="grid grid-cols-3 gap-1">
          {MIX_MODES.map((m) => (
            <Button
              key={m.key}
              size="sm"
              role="tab"
              aria-selected={mode === m.key}
              variant={mode === m.key ? "default" : "outline"}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {HSL_BANDS.map((band) => (
          <Slider
            key={band.key}
            label={
              <>
                <Swatch color={band.swatch} />
                {band.label}
              </>
            }
            min={-100}
            max={100}
            value={state.hsl[band.key][mode]}
            onChange={(value) =>
              update((s) => ({
                ...s,
                hsl: { ...s.hsl, [band.key]: { ...s.hsl[band.key], [mode]: value } },
              }))
            }
            onCommit={commit}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => apply((s) => ({ ...s, hsl: neutralHsl() }))}
        >
          <RotateCcw aria-hidden />
          Reset mixer
        </Button>
      </section>

      <section className="space-y-3 border-t pt-5">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Color balance
        </h2>
        <div role="tablist" aria-label="Tone range" className="grid grid-cols-3 gap-1">
          {TONE_RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              role="tab"
              aria-selected={range === r.key}
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        {BALANCE_AXES.map((axis) => (
          <Slider
            key={axis.key}
            label={
              <>
                {axis.from}
                <span className="text-muted-foreground">↔</span>
                {axis.to}
              </>
            }
            min={-100}
            max={100}
            track={`linear-gradient(to right, ${axis.fromColor}, #9ca3af, ${axis.toColor})`}
            value={state.balance[range][axis.key]}
            onChange={(value) =>
              update((s) => ({
                ...s,
                balance: { ...s.balance, [range]: { ...s.balance[range], [axis.key]: value } },
              }))
            }
            onCommit={commit}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => apply((s) => ({ ...s, balance: neutralBalance() }))}
        >
          <RotateCcw aria-hidden />
          Reset color balance
        </Button>
      </section>
    </div>
  );
}

// ── Adjust ──────────────────────────────────────────────────────────────────

export function AdjustPanel({
  state,
  update,
  commit,
}: {
  state: EditState;
  update: Change;
  commit: () => void;
}) {
  const groups = [...new Set(ADJUST_CONTROLS.map((c) => c.group))];
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group} className="space-y-2.5">
          <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">{group}</h2>
          {ADJUST_CONTROLS.filter((c) => c.group === group).map((control) => (
            <Slider
              key={control.key}
              label={control.label}
              min={control.min}
              max={control.max}
              value={state.adjust[control.key]}
              onChange={(value) =>
                update((s) => ({ ...s, adjust: { ...s.adjust, [control.key]: value } }))
              }
              onCommit={commit}
            />
          ))}
        </section>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          update((s) => ({ ...s, adjust: neutralAdjustments() }));
          commit();
        }}
      >
        <RotateCcw aria-hidden />
        Reset sliders
      </Button>
    </div>
  );
}

// ── Filters ─────────────────────────────────────────────────────────────────

const THUMB_WIDTH = 96;

/** Small copy of the photo, so each filter preview shows this photo. */
function useThumbSource(base: HTMLCanvasElement) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH;
    canvas.height = Math.max(1, Math.round((base.height / base.width) * THUMB_WIDTH));
    canvas.getContext("2d")?.drawImage(base, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, [base]);
}

function FilterThumb({
  source,
  preset,
  label,
  active,
  onClick,
}: {
  source: HTMLCanvasElement;
  preset: FilterPreset | null;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const state = neutralEditState();
    state.filter = { id: preset?.id ?? null, intensity: 100 };
    renderEdit(ref.current, source, source.width, source.height, state);
  }, [source, preset]);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-lg text-center ring-1 ring-border transition hover:ring-foreground/40",
        active && "ring-2 ring-primary",
      )}
    >
      <canvas ref={ref} className="aspect-square w-full object-cover" />
      <span className="block px-1 py-1 text-[0.7rem] font-medium text-slate">{label}</span>
    </button>
  );
}

export function FiltersPanel({
  state,
  base,
  update,
  commit,
  apply,
}: {
  state: EditState;
  base: HTMLCanvasElement;
  update: Change;
  commit: () => void;
  apply: Change;
}) {
  const source = useThumbSource(base);
  const setFilter = (id: string | null) =>
    apply((s) => ({ ...s, filter: { id, intensity: 100 } }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-3">
        <FilterThumb
          source={source}
          preset={null}
          label="None"
          active={state.filter.id === null}
          onClick={() => setFilter(null)}
        />
        {FILTER_PRESETS.map((preset) => (
          <FilterThumb
            key={preset.id}
            source={source}
            preset={preset}
            label={preset.label}
            active={state.filter.id === preset.id}
            onClick={() => setFilter(preset.id)}
          />
        ))}
      </div>
      {state.filter.id && (
        <Slider
          label="Intensity"
          min={0}
          max={100}
          neutral={100}
          value={state.filter.intensity}
          onChange={(intensity) => update((s) => ({ ...s, filter: { ...s.filter, intensity } }))}
          onCommit={commit}
        />
      )}
    </div>
  );
}

// ── Crop & rotate ───────────────────────────────────────────────────────────

export function CropPanel({
  state,
  loaded,
  ratio,
  setRatio,
  update,
  commit,
  apply,
}: {
  state: EditState;
  loaded: LoadedPhoto;
  ratio: number | null;
  setRatio: (ratio: number | null) => void;
  update: Change;
  commit: () => void;
  apply: Change;
}) {
  const { geometry } = state;
  const rotated = rotatedSize(loaded.w, loaded.h, geometry.quarterTurns);
  const imageAspect = rotated.w / rotated.h;

  const RATIOS: { label: string; value: number | null }[] = [
    { label: "Free", value: null },
    { label: "Original", value: imageAspect },
    { label: "1:1", value: 1 },
    { label: "4:5", value: 4 / 5 },
    { label: "3:2", value: 3 / 2 },
    { label: "16:9", value: 16 / 9 },
  ];

  /** Largest centred crop with this ratio. */
  const chooseRatio = (value: number | null) => {
    setRatio(value);
    if (!value) return;
    const fraction = value / imageAspect;
    const w = fraction <= 1 ? fraction : 1;
    const h = fraction <= 1 ? 1 : 1 / fraction;
    apply((s) => ({
      ...s,
      geometry: { ...s.geometry, crop: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } },
    }));
  };

  /** A rotation changes the shape of the image, so the crop starts again. */
  const turn = (by: number) => {
    setRatio(null);
    apply((s) => ({
      ...s,
      geometry: {
        ...s.geometry,
        quarterTurns: (s.geometry.quarterTurns + by + 4) % 4,
        crop: FULL_CROP,
      },
    }));
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">Crop</h2>
        <div className="grid grid-cols-3 gap-2">
          {RATIOS.map(({ label, value }) => (
            <Button
              key={label}
              size="sm"
              variant={ratio === value ? "default" : "outline"}
              onClick={() => chooseRatio(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the box or its corners on the photo. The crop shows when you open another tool.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Rotate & flip
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => turn(-1)}>
            <RotateCcw aria-hidden />
            Left
          </Button>
          <Button size="sm" variant="outline" onClick={() => turn(1)}>
            <RotateCw aria-hidden />
            Right
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              apply((s) => ({ ...s, geometry: { ...s.geometry, flipH: !s.geometry.flipH } }))
            }
          >
            <FlipHorizontal2 aria-hidden />
            Flip H
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              apply((s) => ({ ...s, geometry: { ...s.geometry, flipV: !s.geometry.flipV } }))
            }
          >
            <FlipVertical2 aria-hidden />
            Flip V
          </Button>
        </div>
        <Slider
          label="Straighten"
          min={-15}
          max={15}
          value={geometry.straighten}
          onChange={(straighten) =>
            update((s) => ({ ...s, geometry: { ...s.geometry, straighten } }))
          }
          onCommit={commit}
        />
      </section>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          setRatio(null);
          apply((s) => ({ ...s, geometry: neutralEditState().geometry }));
        }}
      >
        <RotateCcw aria-hidden />
        Reset crop & rotation
      </Button>
    </div>
  );
}

// ── Text ────────────────────────────────────────────────────────────────────

export function TextPanel({
  state,
  selected,
  setSelected,
  setLayer,
  commit,
  apply,
}: {
  state: EditState;
  selected: string | null;
  setSelected: (id: string | null) => void;
  setLayer: (id: string, change: Partial<TextLayer>) => void;
  commit: () => void;
  apply: Change;
}) {
  const layer = state.texts.find((t) => t.id === selected);

  const add = () => {
    const id = crypto.randomUUID();
    apply((s) => ({
      ...s,
      texts: [
        ...s.texts,
        {
          id,
          text: "ReFrame",
          x: 0.5,
          y: 0.5,
          size: 6,
          color: "#ffffff",
          font: TEXT_FONTS[0].value,
        },
      ],
    }));
    setSelected(id);
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus aria-hidden />
        Add text
      </Button>
      {state.texts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add a caption or a watermark, then drag it on the photo.
        </p>
      )}
      {state.texts.length > 0 && (
        <ul className="space-y-1">
          {state.texts.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelected(t.id)}
                className={cn(
                  "w-full truncate rounded-md px-2 py-1.5 text-left text-sm ring-1 ring-border",
                  t.id === selected ? "bg-muted text-foreground" : "text-slate",
                )}
              >
                {t.text.trim() || "Empty text"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {layer && (
        <div className="space-y-3 border-t pt-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate">Text</span>
            <Input
              value={layer.text}
              maxLength={120}
              onChange={(e) => setLayer(layer.id, { text: e.target.value })}
              onBlur={commit}
              className="h-9"
            />
          </label>
          <Slider
            label="Size"
            min={1}
            max={30}
            neutral={6}
            value={layer.size}
            onChange={(size) => setLayer(layer.id, { size })}
            onCommit={commit}
          />
          <div className="grid grid-cols-3 gap-2">
            {TEXT_FONTS.map((font) => (
              <Button
                key={font.value}
                size="sm"
                variant={layer.font === font.value ? "default" : "outline"}
                onClick={() => {
                  setLayer(layer.id, { font: font.value });
                  commit();
                }}
              >
                {font.label}
              </Button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate">
            Color
            <input
              type="color"
              value={layer.color}
              onChange={(e) => setLayer(layer.id, { color: e.target.value })}
              onBlur={commit}
              className="h-8 w-14 cursor-pointer rounded-md border bg-transparent"
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive-text hover:bg-destructive/10"
            onClick={() => {
              setSelected(null);
              apply((s) => ({ ...s, texts: s.texts.filter((t) => t.id !== layer.id) }));
            }}
          >
            <Trash2 aria-hidden />
            Remove this text
          </Button>
        </div>
      )}
    </div>
  );
}

// ── AI ──────────────────────────────────────────────────────────────────────

/** Claude proposes slider values; everything stays editable and can be undone. */
export function AIPanel({ photoId, apply }: { photoId: string; apply: Change }) {
  const [instruction, setInstruction] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [task, setTask] = useState<"auto" | "look" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (kind: "auto" | "look") => {
    setTask(kind);
    startTransition(async () => {
      const result = await suggestPhotoEditAction({
        id: photoId,
        instruction: kind === "look" ? instruction : undefined,
      });
      setTask(null);
      if (!result.ok) {
        toast.error("AI suggestion failed", { description: result.error });
        return;
      }
      const { adjustments, filter, filterIntensity, summary: text } = result.data;
      apply((s) => ({
        ...s,
        adjust: adjustments,
        filter: { id: filter, intensity: filter ? filterIntensity : 100 },
      }));
      setSummary(text);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Claude looks at the photo and sets the sliders for you. You can fine-tune or undo the result.
      </p>
      <Button variant="ai" className="w-full" disabled={pending} onClick={() => run("auto")}>
        {task === "auto" ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Sparkles aria-hidden />
        )}
        Auto-enhance
      </Button>
      <div className="space-y-2 border-t pt-4">
        <label htmlFor="ai-look" className="text-xs font-medium text-slate">
          Or describe a look
        </label>
        <Textarea
          id="ai-look"
          rows={3}
          maxLength={300}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. warm and moody, like a golden-hour film photo"
        />
        <Button
          variant="ai-soft"
          className="w-full"
          disabled={pending || instruction.trim().length < 2}
          onClick={() => run("look")}
        >
          {task === "look" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Wand2 aria-hidden />
          )}
          Apply this look
        </Button>
      </div>
      {summary && <p className="rounded-lg bg-surface p-3 text-xs text-slate">{summary}</p>}
    </div>
  );
}
