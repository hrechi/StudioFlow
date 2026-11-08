import { Download, FileArchive, PackageCheck } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Photo } from "@/modules/photos-galeries/galerie.types";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Client side, once the studio's delivery is verified on-chain: the final photos, each with
 * its own download button, and the whole delivery as the exact ZIP whose fingerprint is on-chain.
 */
export function DeliveryDownloads({
  galerieId,
  photos,
  zipSize,
}: {
  galerieId: string;
  photos: Photo[];
  zipSize: number;
}) {
  return (
    <Card className="ring-2 ring-success/40">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="size-5 text-success-text" aria-hidden />
            Your delivery is ready
          </CardTitle>
          <CardDescription>
            {photos.length} final photo{photos.length === 1 ? "" : "s"}, proven on the blockchain.
            Download them one by one, or all at once.
          </CardDescription>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <a href={`/api/galeries/${galerieId}/livraison`} download>
            <FileArchive aria-hidden />
            Download all (.zip · {formatBytes(zipSize)})
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo) => (
            <li key={photo.id} className="overflow-hidden rounded-lg bg-surface ring-1 ring-border">
              <span className="relative block aspect-square bg-muted">
                <SafeImage
                  src={photo.urlMiniature}
                  alt={photo.nomFichier}
                  fill
                  sizes="(min-width: 1024px) 18vw, 45vw"
                  className="object-cover"
                />
              </span>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-xs text-slate" title={photo.nomFichier}>
                  {photo.nomFichier}
                </span>
                <Button asChild size="icon-sm" variant="outline" className="shrink-0">
                  <a
                    href={`${photo.url}?download=1`}
                    download
                    aria-label={`Download ${photo.nomFichier}`}
                    title={`Download ${photo.nomFichier}`}
                  >
                    <Download aria-hidden />
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
