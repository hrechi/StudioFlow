"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/mock-images";

/** Hosts allowed by next.config `images.remotePatterns`; other URLs are loaded as-is. */
const OPTIMIZED_HOSTS = ["images.unsplash.com"];

function canOptimize(src: string): boolean {
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

/** Equipment photo. A real photo never silently falls back to the empty-state placeholder. */
export function MaterielPhoto({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src?: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const url = src || PLACEHOLDER_IMAGE;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === url;

  if (failed && src) {
    return (
      <div
        role="img"
        aria-label={`${alt}: image unavailable`}
        className="flex size-full items-center justify-center bg-muted text-muted-foreground"
        title="The equipment photo could not be loaded."
      >
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={url !== PLACEHOLDER_IMAGE && !canOptimize(url)}
      onError={() => setFailedUrl(url)}
    />
  );
}
