"use client";

import { Eraser, Upload } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SIGNATURE_TAILLE_MAX, SIGNATURE_TYPES } from "../facturation.types";

/** State of a signature that is either drawn or uploaded. */
export function useSignatureInput() {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  return {
    mode,
    setMode,
    canvas,
    drawn,
    setDrawn,
    file,
    setFile,
    ready: mode === "draw" ? drawn : !!file,
    toBlob: (): Promise<Blob | null> =>
      new Promise((resolve) => {
        if (mode === "upload") resolve(file);
        else if (canvas.current) canvas.current.toBlob(resolve, "image/png");
        else resolve(null);
      }),
  };
}

export function SignatureInput({ id, input }: { id: string; input: ReturnType<typeof useSignatureInput> }) {
  return (
    <Tabs value={input.mode} onValueChange={(value) => input.setMode(value as "draw" | "upload")}>
      <TabsList>
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="upload">Upload an image</TabsTrigger>
      </TabsList>
      {/* forceMount keeps the drawing when switching tabs. */}
      <TabsContent value="draw" forceMount className="data-[state=inactive]:hidden">
        <SignaturePad canvas={input.canvas} drawn={input.drawn} onDrawnChange={input.setDrawn} />
      </TabsContent>
      <TabsContent value="upload" forceMount className="data-[state=inactive]:hidden">
        <ImagePicker id={id} file={input.file} onChange={input.setFile} />
      </TabsContent>
    </Tabs>
  );
}

/** Mouse, pen or finger. The strokes are always dark on white so they print on the PDF. */
function SignaturePad({
  canvas,
  drawn,
  onDrawnChange,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  drawn: boolean;
  onDrawnChange: (drawn: boolean) => void;
}) {
  const drawing = useRef(false);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };

  const begin = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0a0a0a";
    context.beginPath();
    context.moveTo(x, y);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    if (!drawn) onDrawnChange(true);
  };

  const stop = () => {
    drawing.current = false;
  };

  const clear = () => {
    const element = canvas.current;
    element?.getContext("2d")?.clearRect(0, 0, element.width, element.height);
    onDrawnChange(false);
  };

  return (
    <div className="space-y-1">
      <canvas
        ref={canvas}
        width={640}
        height={220}
        aria-label="Draw your signature here. To use the keyboard, upload an image instead."
        className="h-40 w-full cursor-crosshair touch-none rounded-lg border border-dashed bg-white"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Sign inside the box.</p>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={!drawn}>
          <Eraser aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}

export function ImagePicker({ id, file, onChange }: { id: string; file: File | null; onChange: (file: File | null) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const pick = (picked: File | null) => {
    setError(null);
    let valid = picked;
    if (picked && !(SIGNATURE_TYPES as readonly string[]).includes(picked.type)) {
      setError("Choose a JPG, PNG or WEBP image.");
      valid = null;
    } else if (picked && picked.size > SIGNATURE_TAILLE_MAX) {
      setError("The image must be 2 MB or less.");
      valid = null;
    }
    setUrl(valid ? URL.createObjectURL(valid) : null);
    onChange(valid);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-slate hover:bg-muted/40"
      >
        <Upload className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "JPG, PNG or WEBP, 2 MB max…"}</span>
        <input
          id={id}
          type="file"
          accept={SIGNATURE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="text-xs text-destructive-text">{error}</p>}
      {/* A local object URL: next/image cannot optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="Preview" className="max-h-28 rounded-lg border bg-white object-contain p-1" />}
    </div>
  );
}
