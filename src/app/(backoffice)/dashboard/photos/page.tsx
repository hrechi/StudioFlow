/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { CloudUpload, ScanSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { PhotoLibrary } from "@/modules/photos-galeries/components/photo-library";
import { UploadDialog } from "@/modules/photos-galeries/components/upload-dialog";
import { GALERIES, PHOTOS, TAG_CLOUD } from "@/modules/photos-galeries/mock-data";

export const metadata: Metadata = { title: "Photo Library" };

export default async function PhotosPage() {
  await requireArea("photos-galeries");
  const galeriesAvecPhotos = GALERIES.filter((g) => PHOTOS.some((p) => p.galerieId === g.id));

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
        photos={PHOTOS}
        galeries={galeriesAvecPhotos.map(({ id, titre, categorie }) => ({ id, titre, categorie }))}
        tags={TAG_CLOUD}
      />
    </div>
  );
}
