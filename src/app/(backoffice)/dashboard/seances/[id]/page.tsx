/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft, CalendarDays, Clock, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { fullName, inDays } from "@/lib/mock-data-helpers";
import { mockImage } from "@/lib/mock-images";
import { formatDate, formatTime } from "@/lib/utils";
import {
  SeanceDetailTabs,
  type SeanceDetailExtras,
} from "@/modules/seances/components/seance-detail-tabs";
import { getSeance } from "@/modules/seances/mock-data";
import { statutSeanceConfig, typeSeanceLabels } from "@/modules/seances/seance.types";

export const metadata: Metadata = { title: "Session details" };

export default async function SeanceDetailPage({ params }: PageProps<"/dashboard/seances/[id]">) {
  await requireArea("seances");
  const { id } = await params;
  const seance = getSeance(id);
  if (!seance) notFound();

  const done = seance.statut === "TERMINEE";
  // MOCK — will come from the Matériel, Photos & Galeries and Facturation services.
  const extras: SeanceDetailExtras = {
    timeline: [
      { label: "Booking request", date: inDays(-15, 11), etat: "fait" },
      { label: "Quote accepted and deposit received", date: inDays(-12, 16), etat: "fait" },
      { label: "Equipment reserved", date: inDays(-3, 9), etat: "fait" },
      { label: "Photo session", date: seance.dateDebut, etat: done ? "fait" : "en_cours" },
      { label: "AI culling and client selection", etat: done ? "en_cours" : "a_venir" },
      { label: "Retouching and delivery", etat: "a_venir" },
    ],
    materiel: [
      { nom: "Canon EOS R5", categorie: "Camera", statut: "Confirmed" },
      { nom: "RF 85 mm f/1.2", categorie: "Lens", statut: "Confirmed" },
      { nom: "Profoto B10X (x2)", categorie: "Lighting", statut: "Confirmed" },
    ],
    galerie: done
      ? {
          titre: seance.titre,
          statut: "In culling",
          photos: Array.from({ length: 6 }, (_, i) =>
            mockImage(seance.type === "PRODUIT" ? "produit" : "mariage", i),
          ),
          total: 384,
        }
      : null,
    facturation: {
      devis: "DEV-2026-041",
      montantTTC: 2800,
      paye: done ? 2800 : 840,
      statut: done ? "Paid in full" : "30% deposit paid",
    },
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/seances"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Sessions
      </Link>

      <Card className="gap-0 overflow-hidden py-0 md:flex-row">
        <div className="relative h-44 md:h-auto md:w-72 md:shrink-0">
          <SafeImage
            src={seance.couverture}
            alt=""
            fill
            sizes="(min-width: 768px) 288px, 100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={seance.statut} config={statutSeanceConfig} />
                <span className="text-xs font-medium text-muted-foreground">
                  {typeSeanceLabels[seance.type]}
                </span>
              </div>
              <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase">
                {seance.titre}
              </h1>
            </div>
            <div className="flex gap-2">
              <ComingSoonButton variant="outline" feature="Edit the session">
                <Pencil aria-hidden />
                Edit
              </ComingSoonButton>
              {seance.statut === "PLANIFIEE" && (
                <ComingSoonButton feature="Confirm the session">Confirm</ComingSoonButton>
              )}
            </div>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Client">
              <span className="flex items-center gap-2">
                <UserAvatar {...seance.client} size="sm" />
                {fullName(seance.client)}
              </span>
            </Info>
            <Info label="Photographer">
              <span className="flex items-center gap-2">
                <UserAvatar {...seance.photographe} size="sm" />
                {fullName(seance.photographe)}
              </span>
            </Info>
            <Info label="Date">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                {formatDate(seance.dateDebut)}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                {formatTime(seance.dateDebut)} – {formatTime(seance.dateFin)}
              </span>
            </Info>
            <Info label="Location">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-muted-foreground" aria-hidden />
                {seance.lieu.nom}
              </span>
            </Info>
          </dl>
        </div>
      </Card>

      <SeanceDetailTabs seance={seance} extras={extras} />
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-slate">{children}</dd>
    </div>
  );
}
