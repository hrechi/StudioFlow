/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { CloudUpload, ScanSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { PhotoLibrary } from "@/modules/photos-galeries/components/photo-library";
import { UploadDialog } from "@/modules/photos-galeries/components/upload-dialog";
import { listGaleries } from "@/modules/photos-galeries/galerie.service";
import { listRecentPhotos } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = { title: "Photo Library" };

const TAG_CLOUD_SIZE = 12;

export default async function PhotosPage() {
  await requireArea("photos-galeries");
  const [photos, galeries] = await Promise.all([listRecentPhotos(), listGaleries()]);

  // Most frequent AI tags (empty until the AI analysis step fills `tagsIA`).
  const tagCounts = new Map<string, number>();
  for (const tag of photos.flatMap((p) => p.tagsIA)) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TAG_CLOUD_SIZE)
    .map(([tag]) => tag);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Photo Library"
        description="Import, cull and organize session photos. The AI detects blurry shots, closed eyes and duplicates."
        actions={
          <>
            <Button asChild variant="ai-soft">
              <Link href="/dashboard/photos/recherche">
                <ScanSearch aria-hidden />
                AI Search
              </Link>
            </Button>
            <UploadDialog
              galeries={galeries.map(({ id, titre }) => ({ id, titre }))}
              trigger={
                <Button>
                  <CloudUpload aria-hidden />
                  Import photos
                </Button>
              }
            />
          </>
        }
      />
      <PhotoLibrary
        photos={photos}
        galeries={galeries.map(({ id, titre, categorie }) => ({ id, titre, categorie }))}
        tags={tags}
      />
    </div>
  );
}
