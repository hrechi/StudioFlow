import { SafeImage } from "@/components/shared/safe-image";
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

/** Equipment photo (any URL entered by an admin), with the shared placeholder as fallback. */
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
  return (
    <SafeImage
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={url !== PLACEHOLDER_IMAGE && !canOptimize(url)}
    />
  );
}
