/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { CalendarClock, Eye, Lock } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { GuestGallery } from "@/modules/photos-galeries/components/guest-gallery";
import { SharedGalerieAccessForm } from "@/modules/photos-galeries/components/shared-galerie-access-form";
import { getGuestAccess, guestCookieName } from "@/modules/photos-galeries/galerie-guest";
import { categorieGalerieLabels } from "@/modules/photos-galeries/galerie.types";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = {
  title: "Shared gallery",
  robots: { index: false, follow: false },
};

/** Public share link of a gallery: password prompt, then a read-only view. */
export default async function SharedGaleriePage({ params }: PageProps<"/g/[token]">) {
  const { token } = await params;
  const access = await getGuestAccess(token, (await cookies()).get(guestCookieName(token))?.value);

  if (access.status === "unavailable") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pt-32 pb-20 text-center">
        <h1 className="text-2xl font-bold text-charcoal">Gallery not available</h1>
        <p className="text-sm text-muted-foreground">
          This link is invalid, the gallery has expired, or the studio hasn&apos;t shared it yet.
        </p>
        <Button asChild variant="outline">
          <Link href="/galerie">Enter another link</Link>
        </Button>
      </main>
    );
  }

  const { galerie } = access;

  if (access.status === "locked") {
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-32 pb-20">
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-border sm:p-8">
          <div className="space-y-2 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent text-primary-text">
              <Lock className="size-5" aria-hidden />
            </span>
            <h1 className="text-xl font-bold text-charcoal">{galerie.titre}</h1>
            <p className="text-sm text-muted-foreground">
              This gallery is private: enter the password you received.
            </p>
          </div>
          <SharedGalerieAccessForm lien={token} />
        </div>
      </main>
    );
  }

  // Rejected photos are never shown outside the studio.
  const photos = (await listPhotosOfGalerie(galerie.id))
    .filter((p) => p.statutCulling !== "REJETEE")
    .map(({ id, nomFichier }) => ({ id, nomFichier }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-5 pt-28 pb-20 sm:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {categorieGalerieLabels[galerie.categorie]} · Shared gallery
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
          {galerie.titre}
        </h1>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden />
            View only, no downloads · {photos.length} photo{photos.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            Available until {formatDate(galerie.dateExpiration)}
          </span>
        </p>
      </header>
      <GuestGallery token={token} photos={photos} />
    </main>
  );
}
