/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { AlertTriangle, ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { fullName } from "@/lib/mock-data-helpers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BreakdownDialog } from "@/modules/materiel/components/materiel-dialogs";
import {
  categorieMaterielLabels,
  etatMaterielConfig,
  statutReservationConfig,
} from "@/modules/materiel/materiel.types";
import { getMateriel, getReservationsOf } from "@/modules/materiel/mock-data";

export const metadata: Metadata = { title: "Equipment" };

export default async function MaterielDetailPage({
  params,
}: PageProps<"/dashboard/materiel/[id]">) {
  await requireArea("materiel");
  const { id } = await params;
  const materiel = getMateriel(id);
  if (!materiel) notFound();
  const reservations = getReservationsOf(id);

  const specs = [
    ["Category", categorieMaterielLabels[materiel.categorie]],
    ["Brand", materiel.marque],
    ["Model", materiel.modele],
    ["Serial number", materiel.numeroSerie],
    ["Purchase date", formatDate(materiel.dateAchat)],
    ["Purchase price", formatCurrency(materiel.prix)],
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/materiel"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Inventory
      </Link>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="gap-0 self-start overflow-hidden py-0">
          <div className="relative aspect-[4/3] bg-muted">
            <SafeImage
              src={materiel.photo}
              alt={materiel.nom}
              fill
              sizes="352px"
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={materiel.etat} config={etatMaterielConfig} />
                <ToneBadge
                  tone={materiel.disponible ? "success" : "neutral"}
                  label={materiel.disponible ? "Available" : "Unavailable"}
                  dot
                />
              </div>
              <h1 className="text-xl font-medium tracking-[0.08em] text-foreground uppercase">
                {materiel.nom}
              </h1>
            </div>
            <dl className="divide-y text-sm">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-slate">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <ComingSoonButton feature="Reserve this equipment">
                <CalendarPlus aria-hidden />
                Reserve
              </ComingSoonButton>
              <BreakdownDialog
                materielNom={materiel.nom}
                trigger={
                  <Button variant="destructive-soft">
                    <AlertTriangle aria-hidden />
                    Breakdown
                  </Button>
                }
              />
            </div>
          </div>
        </Card>

        <Card className="gap-0 self-start py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Reservation history</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {reservations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                This equipment has never been reserved.
              </p>
            ) : (
              <ul className="divide-y">
                {reservations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <UserAvatar {...r.photographe} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.seance.titre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fullName(r.photographe)} · {formatDate(r.dateDebut)} →{" "}
                        {formatDate(r.dateFin)}
                      </p>
                      {r.remarqueRetour && (
                        <p className="mt-1 text-xs text-slate">Return: “{r.remarqueRetour}”</p>
                      )}
                    </div>
                    <StatusBadge value={r.statut} config={statutReservationConfig} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
