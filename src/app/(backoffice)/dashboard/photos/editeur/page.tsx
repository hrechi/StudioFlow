/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ArrowLeft, ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SafeImage } from "@/components/shared/safe-image";
import { requireArea } from "@/lib/guards";
import { PhotoEditor } from "@/modules/photos-galeries/components/photo-editor/photo-editor";
import { getGalerieById, listGaleries } from "@/modules/photos-galeries/galerie.service";
import { getPhotoById, listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = { title: "Photo Editing" };

/** ?photo=… opens the editor; otherwise choose a gallery (?galerie=…), then a photo. */
export default async function PhotoEditingPage({
  searchParams,
}: PageProps<"/dashboard/photos/editeur">) {
  await requireArea("photos-galeries");
  const { photo: photoId, galerie: galerieId } = await searchParams;

  const photo = typeof photoId === "string" ? await getPhotoById(photoId) : null;
  if (photo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Photo Editing" />
        <PhotoEditor key={photo.id} photo={photo} />
      </div>
    );
  }

  const galerie = typeof galerieId === "string" ? await getGalerieById(galerieId) : null;
  if (galerie) {
    const photos = await listPhotosOfGalerie(galerie.id);
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            <Link
              href="/dashboard/photos/editeur"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Galleries
            </Link>
          }
          title={galerie.titre}
          description="Choose the photo to edit. The original stays as it is."
        />
        {photos.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title="No photos yet"
            description="Import photos into this gallery to edit them."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/photos/editeur?photo=${p.id}`}
                  className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:ring-foreground/40"
                >
                  <span className="relative block aspect-[4/3] bg-muted">
                    <SafeImage
                      src={p.urlMiniature}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 20vw, 45vw"
                      className="object-cover"
                    />
                    {p.estEditee && (
                      <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-semibold text-bone">
                        Edited
                      </span>
                    )}
                  </span>
                  <span className="block truncate p-2 text-xs text-slate">{p.nomFichier}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const galeries = await listGaleries();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Photo Editing"
        description="Filters, color, crop and text, right here in the dashboard. Choose a gallery to start."
      />
      {galeries.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No galleries yet"
          description="Create a gallery and import photos to edit them."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {galeries.map((g) => (
            <li key={g.id}>
              <Link
                href={`/dashboard/photos/editeur?galerie=${g.id}`}
                className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:ring-foreground/40"
              >
                <span className="relative block aspect-[16/9] bg-muted">
                  <SafeImage
                    src={g.photoCouverture}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </span>
                <span className="block p-3">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {g.titre}
                  </span>
                  <span className="text-xs text-muted-foreground">{g.nombrePhotos} photos</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
