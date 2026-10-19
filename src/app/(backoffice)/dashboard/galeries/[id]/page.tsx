/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ArrowLeft, CalendarDays, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { requireArea } from "@/lib/guards";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate } from "@/lib/utils";
import { GalerieActions } from "@/modules/photos-galeries/components/galerie-actions";
import { GalerieManager } from "@/modules/photos-galeries/components/galerie-manager";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import {
  GALERIE_PIPELINE,
  categorieGalerieLabels,
  statutGalerieConfig,
} from "@/modules/photos-galeries/galerie.types";
import { listPhotosOfGalerie } from "@/modules/photos-galeries/photo.service";
import { listClientRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalerieDetailPage({ params }: PageProps<"/dashboard/galeries/[id]">) {
  await requireArea("photos-galeries");
  const { id } = await params;
  const galerie = await getGalerieById(id);
  if (!galerie) notFound();
  const [photos, clients] = await Promise.all([listPhotosOfGalerie(id), listClientRefs()]);
  const currentStep = GALERIE_PIPELINE.indexOf(galerie.statut);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/galeries"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Galleries
        </Link>
        <GalerieActions galerie={galerie} clients={clients} />
      </div>
      <div className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow-soft ring-1 ring-border md:flex-row md:items-center">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-muted">
          <SafeImage
            src={galerie.photoCouverture}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={galerie.statut} config={statutGalerieConfig} />
            <span className="text-xs text-muted-foreground">
              {categorieGalerieLabels[galerie.categorie]}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">{galerie.titre}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate">
            <span className="flex items-center gap-2">
              <UserAvatar {...galerie.client} size="sm" />
              {fullName(galerie.client)}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              Created {formatDate(galerie.dateCreation)}
            </span>
            {galerie.seance && (
              <Link
                href={`/dashboard/seances/${galerie.seance.id}`}
                className="text-primary-text hover:underline"
              >
                View session
              </Link>
            )}
          </div>
        </div>
        <ol className="flex items-center gap-1.5" aria-label="Gallery steps">
          {GALERIE_PIPELINE.map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  index < currentStep && "bg-success/10 text-success-text",
                  index === currentStep && "bg-primary text-white",
                  index > currentStep && "bg-muted text-muted-foreground",
                )}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {index < currentStep && <Check className="size-3" aria-hidden />}
                {statutGalerieConfig[step].label}
              </span>
              {index < GALERIE_PIPELINE.length - 1 && (
                <span className="h-px w-3 bg-light-gray" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </div>
      <GalerieManager galerie={galerie} photos={photos} />
    </div>
  );
}
