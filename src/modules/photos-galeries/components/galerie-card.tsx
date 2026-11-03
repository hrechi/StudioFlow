import { CalendarClock, Heart, Images, Lock } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate } from "@/lib/utils";
import { categorieGalerieLabels, statutGalerieConfig, type Galerie } from "../galerie.types";

/** Photo-first gallery card (backoffice and client area). */
export function GalerieCard({
  galerie,
  href,
  showClient = true,
}: {
  galerie: Galerie;
  href: string;
  showClient?: boolean;
}) {
  const expired = new Date(galerie.dateExpiration) < new Date();
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border transition-shadow hover:shadow-lift focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <SafeImage
          src={galerie.photoCouverture}
          alt=""
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <StatusBadge
            value={galerie.statut}
            config={statutGalerieConfig}
            className="bg-card ring-card"
          />
        </div>
        {galerie.protegeeParMotDePasse && (
          <span
            className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-black/70 text-bone backdrop-blur-sm"
            title="Password protected"
          >
            <Lock className="size-3.5" aria-label="Password protected" />
          </span>
        )}
        <p className="absolute bottom-3 left-4 text-xs font-semibold tracking-wide text-white/90 uppercase">
          {categorieGalerieLabels[galerie.categorie]}
        </p>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="truncate font-semibold text-foreground group-hover:text-primary-text">
          {galerie.titre}
        </h3>
        {showClient && <p className="text-sm text-muted-foreground">{fullName(galerie.client)}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Images className="size-3.5" aria-hidden />
            {galerie.nombrePhotos} photos
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {galerie.nombreSelection} selected
          </span>
          <span className={cn("flex items-center gap-1", expired && "text-destructive-text")}>
            <CalendarClock className="size-3.5" aria-hidden />
            {expired ? "Expired" : `Until ${formatDate(galerie.dateExpiration)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
