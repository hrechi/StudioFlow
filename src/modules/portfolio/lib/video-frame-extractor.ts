"use client";

import type { PlancheContactFrame } from "../portfolio.types";

export type ExtractedFrameCandidate = {
  id: string;
  blob: Blob;
  previewUrl: string;
  timestamp: number;
  caption: string;
  order: number;
};

export type ProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  statusText: string;
}) => void;

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm"];
const ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 Mo
export const MAX_DURATION_SECONDS = 30; // 30 s max

/**
 * Validates video file size and format before loading.
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith("video/");

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Format non supporté (${file.type || ext}). Veuillez importer une vidéo au format MP4, MOV ou WebM.`,
    };
  }

  if (file.size > MAX_VIDEO_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Fichier trop volumineux (${sizeMb} Mo). La taille maximale autorisée est de 50 Mo.`,
    };
  }

  return { valid: true };
}

/**
 * Loads video element and verifies metadata (including duration <= 30s).
 */
export async function loadVideoElement(
  source: File | string,
): Promise<{ video: HTMLVideoElement; cleanup: () => void; duration: number }> {
  const isFile = source instanceof File;
  const objectUrl = isFile ? URL.createObjectURL(source) : source;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.src = objectUrl;

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (isFile && objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
  };

  return new Promise((resolve, reject) => {
    const onLoadedMetadata = () => {
      cleanupListeners();
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        cleanup();
        reject(new Error("Impossible de déterminer la durée de la vidéo. Fichier corrompu."));
        return;
      }
      if (video.duration > MAX_DURATION_SECONDS + 0.8) {
        cleanup();
        reject(
          new Error(
            `La vidéo dure ${video.duration.toFixed(1)} s. La durée maximale autorisée est de 30 secondes.`,
          ),
        );
        return;
      }
      resolve({ video, cleanup, duration: video.duration });
    };

    const onError = () => {
      cleanupListeners();
      cleanup();
      reject(new Error("Échec de chargement de la vidéo. Format ou codec incompatible."));
    };

    const cleanupListeners = () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);

    // Timeout safety
    setTimeout(() => {
      cleanupListeners();
      cleanup();
      reject(new Error("Délai dépassé lors du chargement de la vidéo."));
    }, 15000);
  });
}

/**
 * Seeks video to a specific timestamp and waits for "seeked" event.
 */
function seekTo(video: HTMLVideoElement, timestamp: number): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const target = Math.max(0, Math.min(video.duration - 0.05, timestamp));

    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = target;

    // Fallback if seeked doesn't fire fast enough
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
    }, 1200);
  });
}

/**
 * Draws the current frame of the video onto an off-screen canvas and exports a WebP/JPEG blob.
 */
function renderFrameToBlob(
  video: HTMLVideoElement,
  maxWidth = 1200,
  quality = 0.85,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    try {
      const naturalW = video.videoWidth || 1280;
      const naturalH = video.videoHeight || 720;
      const scale = Math.min(1, maxWidth / naturalW);
      const width = Math.round(naturalW * scale);
      const height = Math.round(naturalH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      const mimeType = "image/webp";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to jpeg
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) {
                  reject(new Error("Canvas blob conversion failed"));
                  return;
                }
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve({ blob: jpegBlob, dataUrl });
              },
              "image/jpeg",
              quality,
            );
            return;
          }
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve({ blob, dataUrl });
        },
        mimeType,
        quality,
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Uploads a frame blob to `/api/portfolio/upload` and returns its hosted URL.
 */
export async function uploadFrameBlob(blob: Blob, filename = "frame.webp"): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, filename);

  const res = await fetch("/api/portfolio/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || "Échec du téléversement de la vignette.");
  }

  const json = await res.json();
  return json?.data?.url || json?.data?.urlMiniature;
}

/**
 * Uploads the raw video file to `/api/portfolio/upload`.
 */
export async function uploadVideoFile(file: File): Promise<string> {
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/portfolio/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || "Échec du téléversement de la vidéo.");
  }

  const json = await res.json();
  return json?.data?.url;
}

/**
 * Extracts N frames evenly spaced between trimStart and trimEnd.
 */
export async function extractVideoFrames(options: {
  source: File | string;
  trimStart: number;
  trimEnd: number;
  frameCount: number;
  onProgress?: ProgressCallback;
}): Promise<ExtractedFrameCandidate[]> {
  const { source, trimStart, trimEnd, frameCount, onProgress } = options;
  const count = Math.max(6, Math.min(24, frameCount));

  const { video, cleanup, duration } = await loadVideoElement(source);

  try {
    const start = Math.max(0, Math.min(duration, trimStart));
    const end = Math.max(start + 0.1, Math.min(duration, trimEnd <= start ? duration : trimEnd));
    const span = end - start;

    const timestamps = Array.from({ length: count }, (_, i) => {
      if (count === 1) return start;
      return Number((start + (i * span) / (count - 1)).toFixed(3));
    });

    const results: ExtractedFrameCandidate[] = [];

    for (let i = 0; i < count; i++) {
      const ts = timestamps[i];
      onProgress?.({
        current: i + 1,
        total: count,
        percentage: Math.round(((i + 0.2) / count) * 100),
        statusText: `Extraction de l'image ${i + 1} / ${count} (${ts.toFixed(1)}s)...`,
      });

      await seekTo(video, ts);
      const { blob, dataUrl } = await renderFrameToBlob(video, 1200, 0.85);

      const frameNumber = 18 + i;
      const caption = `${frameNumber}A`;

      results.push({
        id: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        blob,
        previewUrl: dataUrl,
        timestamp: ts,
        caption,
        order: i,
      });

      onProgress?.({
        current: i + 1,
        total: count,
        percentage: Math.round(((i + 1) / count) * 100),
        statusText: `Image ${i + 1} / ${count} capturée`,
      });
    }

    return results;
  } finally {
    cleanup();
  }
}

/**
 * Captures a single replacement frame at a given timestamp.
 */
export async function captureSingleFrame(
  source: File | string,
  timestamp: number,
): Promise<{ blob: Blob; dataUrl: string; timestamp: number }> {
  const { video, cleanup, duration } = await loadVideoElement(source);
  try {
    const clamped = Math.max(0, Math.min(duration, timestamp));
    await seekTo(video, clamped);
    const { blob, dataUrl } = await renderFrameToBlob(video, 1200, 0.85);
    return { blob, dataUrl, timestamp: clamped };
  } finally {
    cleanup();
  }
}

/**
 * Batch uploads extracted frame blobs to hosted storage and returns PlancheContactFrame[].
 */
export async function uploadExtractedFrames(
  candidates: ExtractedFrameCandidate[],
  onProgress?: ProgressCallback,
): Promise<PlancheContactFrame[]> {
  const total = candidates.length;
  const frames: PlancheContactFrame[] = [];

  for (let i = 0; i < total; i++) {
    const item = candidates[i];
    onProgress?.({
      current: i + 1,
      total,
      percentage: Math.round(((i + 0.5) / total) * 100),
      statusText: `Sauvegarde de l'image ${i + 1} / ${total}...`,
    });

    const hostedUrl = await uploadFrameBlob(item.blob, `tri_x_frame_${i + 1}.webp`);

    frames.push({
      id: item.id,
      imageUrl: hostedUrl,
      timestamp: item.timestamp,
      caption: item.caption,
      order: item.order,
    });
  }

  return frames;
}

