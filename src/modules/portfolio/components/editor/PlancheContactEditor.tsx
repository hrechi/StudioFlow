"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Film,
  UploadCloud,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Sparkles,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import type { PlancheContactData, PlancheContactFrame } from "../../portfolio.types";
import {
  validateVideoFile,
  loadVideoElement,
  extractVideoFrames,
  uploadExtractedFrames,
  uploadVideoFile,
  captureSingleFrame,
  uploadFrameBlob,
  type ExtractedFrameCandidate,
} from "../../lib/video-frame-extractor";

type PlancheContactEditorProps = {
  plancheContact?: PlancheContactData;
  onChange: (data: PlancheContactData) => void;
  accentColor?: string;
};

export function PlancheContactEditor({
  plancheContact,
  onChange,
  accentColor = "#e8a34a",
}: PlancheContactEditorProps) {
  const [active, setActive] = useState(plancheContact?.active ?? true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(plancheContact?.videoUrl || "");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(plancheContact?.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState<number>(plancheContact?.trimEnd ?? 0);
  const [frameCount, setFrameCount] = useState<number>(12);
  const [frames, setFrames] = useState<PlancheContactFrame[]>(plancheContact?.frames || []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Frame replacer state
  const [replacingFrameId, setReplacingFrameId] = useState<string | null>(null);
  const [replaceTimestamp, setReplaceTimestamp] = useState<number>(0);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    if (plancheContact) {
      setActive(plancheContact.active);
      if (plancheContact.videoUrl && !videoUrl) setVideoUrl(plancheContact.videoUrl);
      if (plancheContact.trimStart !== undefined) setTrimStart(plancheContact.trimStart);
      if (plancheContact.trimEnd !== undefined) setTrimEnd(plancheContact.trimEnd);
      if (plancheContact.frames) setFrames(plancheContact.frames);
    }
  }, [plancheContact]);

  // Load duration when videoUrl or file changes
  useEffect(() => {
    if (!videoUrl && !videoFile) return;
    let isCancelled = false;

    const loadMeta = async () => {
      try {
        setErrorMessage(null);
        const { duration, cleanup } = await loadVideoElement(videoFile || videoUrl);
        if (!isCancelled) {
          setVideoDuration(duration);
          if (trimEnd === 0 || trimEnd > duration) {
            setTrimEnd(Number(duration.toFixed(1)));
          }
        }
        cleanup();
      } catch (err: unknown) {
        if (!isCancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Erreur lors du chargement de la vidéo.");
        }
      }
    };

    void loadMeta();
    return () => {
      isCancelled = true;
    };
  }, [videoFile, videoUrl]);

  // Handle video selection
  const handleSelectFile = async (file: File) => {
    setErrorMessage(null);
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Fichier invalide.");
      return;
    }

    try {
      const { duration, cleanup } = await loadVideoElement(file);
      cleanup();
      setVideoFile(file);
      const localBlobUrl = URL.createObjectURL(file);
      setVideoUrl(localBlobUrl);
      setVideoDuration(duration);
      setTrimStart(0);
      setTrimEnd(Number(duration.toFixed(1)));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur lors de l'analyse du fichier vidéo.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      void handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.currentTime >= trimEnd) {
      video.pause();
      setIsPlaying(false);
      video.currentTime = trimStart;
    }
  };

  // Generate frames
  const handleGenerateFrames = async () => {
    if (!videoFile && !videoUrl) {
      setErrorMessage("Veuillez d'abord importer une vidéo.");
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setProgress({ percent: 5, text: "Initialisation du découpage..." });

    try {
      // 1. If we have a local File, upload the video first so we have a permanent URL
      let hostedVideoUrl = videoUrl;
      if (videoFile && (!videoUrl || videoUrl.startsWith("blob:"))) {
        setProgress({ percent: 10, text: "Téléversement de la vidéo source..." });
        hostedVideoUrl = await uploadVideoFile(videoFile);
        setVideoUrl(hostedVideoUrl);
      }

      // 2. Extract frames client-side
      const candidates: ExtractedFrameCandidate[] = await extractVideoFrames({
        source: videoFile || hostedVideoUrl,
        trimStart,
        trimEnd: trimEnd || videoDuration,
        frameCount,
        onProgress: (p) => {
          setProgress({
            percent: Math.round(15 + p.percentage * 0.45),
            text: p.statusText,
          });
        },
      });

      // 3. Batch upload the extracted frame blobs
      const uploadedFrames = await uploadExtractedFrames(candidates, (p) => {
        setProgress({
          percent: Math.round(60 + p.percentage * 0.4),
          text: p.statusText,
        });
      });

      setFrames(uploadedFrames);

      // 4. Save to portfolio
      const payload: PlancheContactData = {
        active: true,
        videoUrl: hostedVideoUrl,
        trimStart,
        trimEnd,
        frames: uploadedFrames,
      };
      onChange(payload);

      setProgress({ percent: 100, text: "Planche contact générée avec succès !" });
      setTimeout(() => setIsExtracting(false), 900);
    } catch (err: unknown) {
      setIsExtracting(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Une erreur est survenue lors de la génération.",
      );
    }
  };

  // Frame editing handlers
  const handleDeleteFrame = (id: string) => {
    const updated = frames.filter((f) => f.id !== id).map((f, idx) => ({ ...f, order: idx }));
    setFrames(updated);
    onChange({
      active,
      videoUrl,
      trimStart,
      trimEnd,
      frames: updated,
    });
  };

  const handleMoveFrame = (index: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= frames.length) return;
    const reordered = [...frames];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    const updated = reordered.map((f, idx) => ({ ...f, order: idx }));
    setFrames(updated);
    onChange({
      active,
      videoUrl,
      trimStart,
      trimEnd,
      frames: updated,
    });
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    const updated = frames.map((f) => (f.id === id ? { ...f, caption } : f));
    setFrames(updated);
    onChange({
      active,
      videoUrl,
      trimStart,
      trimEnd,
      frames: updated,
    });
  };

  // Open replace dialog for a frame
  const handleStartReplace = (frame: PlancheContactFrame) => {
    setReplacingFrameId(frame.id);
    setReplaceTimestamp(frame.timestamp);
    setReplacePreviewUrl(frame.imageUrl);
  };

  // Capture single frame preview when scrubber moves
  const handleSeekReplace = useCallback(
    async (timestamp: number) => {
      setReplaceTimestamp(timestamp);
      try {
        const { dataUrl } = await captureSingleFrame(videoFile || videoUrl, timestamp);
        setReplacePreviewUrl(dataUrl);
      } catch {
        // silent preview fallback
      }
    },
    [videoFile, videoUrl],
  );

  // Confirm replacement
  const handleConfirmReplace = async () => {
    if (!replacingFrameId) return;
    setIsReplacing(true);
    try {
      const { blob } = await captureSingleFrame(videoFile || videoUrl, replaceTimestamp);
      const uploadedUrl = await uploadFrameBlob(blob, `frame_replace_${Date.now()}.webp`);

      const updated = frames.map((f) =>
        f.id === replacingFrameId
          ? { ...f, imageUrl: uploadedUrl, timestamp: replaceTimestamp }
          : f,
      );
      setFrames(updated);
      onChange({
        active,
        videoUrl,
        trimStart,
        trimEnd,
        frames: updated,
      });
      setReplacingFrameId(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur lors du remplacement de l'image.");
    } finally {
      setIsReplacing(false);
    }
  };

  const handleToggleActive = (checked: boolean) => {
    setActive(checked);
    onChange({
      active: checked,
      videoUrl,
      trimStart,
      trimEnd,
      frames,
    });
  };

  return (
    <div className="space-y-4 rounded-[10px] border border-white/[0.08] bg-black/30 p-3.5">
      {/* Header with Title & Active Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-[6px] border border-[#e8a34a]/30 bg-[#e8a34a]/10"
            style={{ color: accentColor }}
          >
            <Film className="size-3.5" />
          </div>
          <div>
            <h4 className="font-sans text-xs font-semibold text-[#f3ebdd]">
              Planche contact 35mm
            </h4>
            <p className="font-mono text-[9px] text-[#9a8f82]">
              Pellicule animée Kodak TRI-X 400
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => handleToggleActive(!active)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border p-0.5 transition-colors ${
            active ? "border-[#e8a34a]/40 bg-[#e8a34a]" : "border-white/20 bg-white/10"
          }`}
        >
          <span
            className={`inline-block size-3.5 rounded-full transition-transform ${
              active ? "translate-x-4 bg-[#120b07]" : "translate-x-0 bg-white/60"
            }`}
          />
        </button>
      </div>

      {active && (
        <>
          {/* Error Message banner */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-[6px] border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Upload Video Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-[8px] border border-dashed p-4 text-center transition-all ${
              isDragOver
                ? "border-[#e8a34a] bg-[#e8a34a]/10"
                : "border-white/15 bg-white/[0.02] hover:border-white/25"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              onChange={(e) => e.target.files?.[0] && void handleSelectFile(e.target.files[0])}
              className="hidden"
            />
            <UploadCloud className="size-6 text-[#e8a34a] opacity-80" />
            <p className="mt-1.5 font-sans text-xs font-medium text-[#f3ebdd]">
              {videoFile ? videoFile.name : videoUrl ? "Vidéo sélectionnée" : "Importer une courte vidéo"}
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-[#9a8f82]">
              MP4, MOV, WebM · Max 30 s · Max 50 Mo
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2.5 rounded-[6px] border border-white/15 bg-white/5 px-2.5 py-1 font-sans text-[11px] font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              {videoUrl || videoFile ? "Changer de vidéo" : "Parcourir les fichiers"}
            </button>
          </div>

          {/* 2. Video Preview & Trim Controls (if video available) */}
          {(videoUrl || videoFile) && (
            <div className="space-y-3 rounded-[8px] border border-white/[0.06] bg-black/40 p-3">
              {/* Mini Video Player */}
              <div className="relative aspect-video w-full overflow-hidden rounded-[6px] bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={onTimeUpdate}
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/10"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#e8a34a] text-black shadow-lg">
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                  </div>
                </button>
                <div className="absolute bottom-1.5 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white/90">
                  {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                </div>
              </div>

              {/* Trim Range Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#9a8f82]">
                    <Scissors className="size-3 text-[#e8a34a]" /> Trim (début / fin)
                  </span>
                  <span className="font-mono text-[#e8a34a]">
                    {trimStart.toFixed(1)}s → {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/40">Début (s)</label>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, trimEnd - 0.5)}
                      step="0.1"
                      value={trimStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimStart(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-[#e8a34a]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40">Fin (s)</label>
                    <input
                      type="range"
                      min={Math.min(videoDuration, trimStart + 0.5)}
                      max={videoDuration || 30}
                      step="0.1"
                      value={trimEnd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimEnd(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-[#e8a34a]"
                    />
                  </div>
                </div>
              </div>

              {/* Number of Images Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#9a8f82]">
                    <Layers className="size-3 text-[#e8a34a]" /> Nombre d&apos;images
                  </span>
                  <span className="font-mono font-bold text-[#f3ebdd]">{frameCount}</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="24"
                  step="1"
                  value={frameCount}
                  onChange={(e) => setFrameCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#e8a34a]"
                />
                <div className="flex justify-between font-mono text-[8px] text-white/30">
                  <span>6</span>
                  <span>12 (défaut)</span>
                  <span>24</span>
                </div>
              </div>

              {/* Progress Bar (during extraction) */}
              {isExtracting && (
                <div className="space-y-1.5 rounded-[6px] border border-[#e8a34a]/30 bg-[#e8a34a]/10 p-2.5">
                  <div className="flex justify-between text-[10px] text-[#e8a34a]">
                    <span>{progress.text}</span>
                    <span className="font-mono font-bold">{progress.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#e8a34a] to-amber-300 transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button: Générer la pellicule */}
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => void handleGenerateFrames()}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#e8a34a] py-2 font-sans text-xs font-semibold text-black shadow-md transition-all hover:bg-amber-400 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Découpage en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Générer la pellicule
                  </>
                )}
              </button>
            </div>
          )}

          {/* 3. Extracted Frames Grid */}
          {frames.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-semibold tracking-wider text-[#9a8f82] uppercase">
                  Vignettes extraites ({frames.length})
                </span>
                <span className="font-mono text-[9px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Sauvegardé
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className="group relative flex flex-col rounded-[6px] border border-white/10 bg-[#16100c] p-1.5 shadow-sm"
                  >
                    {/* Thumbnail & Number */}
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[3px] bg-neutral-900">
                      <SafeImage
                        src={frame.imageUrl}
                        alt={frame.caption || ""}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      <span className="absolute top-1 left-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[8px] font-bold text-[#e8a34a]">
                        {frame.caption || `${18 + index}A`}
                      </span>
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[7px] text-white/70">
                        {frame.timestamp.toFixed(1)}s
                      </span>
                    </div>

                    {/* Caption Input */}
                    <input
                      type="text"
                      value={frame.caption || ""}
                      placeholder={`${18 + index}A`}
                      onChange={(e) => handleUpdateCaption(frame.id, e.target.value)}
                      className="mt-1.5 w-full rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />

                    {/* Frame Actions toolbar */}
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1 text-white/50">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="Déplacer vers la gauche"
                          disabled={index === 0}
                          onClick={() => handleMoveFrame(index, "left")}
                          className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-20"
                        >
                          <ArrowLeft className="size-2.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Déplacer vers la droite"
                          disabled={index === frames.length - 1}
                          onClick={() => handleMoveFrame(index, "right")}
                          className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-20"
                        >
                          <ArrowRight className="size-2.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Remplacer cette image"
                          onClick={() => handleStartReplace(frame)}
                          className="rounded p-1 hover:bg-white/10 hover:text-[#e8a34a]"
                        >
                          <RefreshCw className="size-2.5" />
                        </button>
                        <button
                          type="button"
                          title="Supprimer cette image"
                          onClick={() => handleDeleteFrame(frame.id)}
                          className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="size-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Single Frame Replace Modal */}
          {replacingFrameId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
              <div className="w-full max-w-sm space-y-3 rounded-[10px] border border-white/15 bg-[#17120e] p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans text-xs font-semibold text-[#f3ebdd]">
                    Remplacer la vignette
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReplacingFrameId(null)}
                    className="text-white/40 hover:text-white text-xs"
                  >
                    ×
                  </button>
                </div>

                {/* Instant preview */}
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[6px] border border-white/10 bg-black">
                  {replacePreviewUrl && (
                    <SafeImage
                      src={replacePreviewUrl}
                      alt="Aperçu capture"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                  <span className="absolute bottom-1.5 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-[#e8a34a]">
                    {replaceTimestamp.toFixed(2)}s
                  </span>
                </div>

                {/* Scrubber to pick exact second */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-white/50">
                    <span>Position sur la vidéo</span>
                    <span>{replaceTimestamp.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 30}
                    step="0.05"
                    value={replaceTimestamp}
                    onChange={(e) => void handleSeekReplace(parseFloat(e.target.value))}
                    className="w-full accent-[#e8a34a]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplacingFrameId(null)}
                    className="rounded-[6px] border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isReplacing}
                    onClick={() => void handleConfirmReplace()}
                    className="rounded-[6px] bg-[#e8a34a] px-3 py-1.5 font-sans text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isReplacing ? "Capture..." : "Appliquer cet instant"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

