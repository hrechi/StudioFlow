"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/mock-images";

/**
 * next/image that swaps to the local placeholder if the remote photo fails.
 * Photos served by our own `/api/...` routes need the session cookie, which the
 * image optimizer doesn't send, so they are loaded as-is (they are already thumbnails).
 */
export function SafeImage({ src, alt, unoptimized, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const failed = failedSrc !== null && failedSrc === src;
  return (
    <Image
      {...props}
      unoptimized={unoptimized ?? (typeof src === "string" && src.startsWith("/api/"))}
      src={failed ? PLACEHOLDER_IMAGE : src}
      alt={alt}
      onError={() => setFailedSrc(src)}
    />
  );
}
