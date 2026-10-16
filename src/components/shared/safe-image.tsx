"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/mock-images";

/** next/image that swaps to the local placeholder if the remote photo fails. */
export function SafeImage({ src, alt, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const failed = failedSrc !== null && failedSrc === src;
  return (
    <Image
      {...props}
      src={failed ? PLACEHOLDER_IMAGE : src}
      alt={alt}
      onError={() => setFailedSrc(src)}
    />
  );
}
