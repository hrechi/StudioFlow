/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Banknote, CloudSun, MapPin, Pencil, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { cn, formatCurrency } from "@/lib/utils";
import { disponibiliteSemaine, listLieux } from "@/modules/seances/lieu.service";
import { LieuDisponibleToggle } from "@/modules/seances/components/lieu-disponible-toggle";
import { typeLieuLabels } from "@/modules/seances/lieu.types";

export const metadata: Metadata = { title: "Locations" };

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_MS = 86_400_000;

export default async function LieuxPage() {
  const user = await requireArea("seances");
  const isAdmin = user.role === "ADMIN";
  const lieux = await listLieux();
  const { debut, occupes } = await disponibiliteSemaine(lieux.map((l) => l.id), 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shooting locations"
        description="Studios, outdoor spots and on-site sessions, with their availability."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/dashboard/lieux/nouveau">
                <Plus aria-hidden />
                New location
              </Link>
            </Button>
          ) : undefined
        }
      />
      {lieux.length === 0 ? (
        <EmptyState
          title="No location yet"
          description="Add the studio and the outdoor spots you shoot at, so sessions can be linked to them."
          action={
            isAdmin ? (
              <Button asChild>
                <Link href="/dashboard/lieux/nouveau">New location</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lieux.map((lieu) => {
            const busyDays = occupes.get(lieu.id) ?? [];
            return (
              <Card key={lieu.id} className="gap-0 overflow-hidden py-0">
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{lieu.nom}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{lieu.adresse}</span>
                      </p>
                    </div>
                    {isAdmin ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {lieu.disponible ? "Available" : "Unavailable"}
                        </span>
                        <LieuDisponibleToggle
                          lieuId={lieu.id}
                          disponible={lieu.disponible}
                          nom={lieu.nom}
                        />
                      </div>
                    ) : (
                      <ToneBadge
                        tone={lieu.disponible ? "success" : "danger"}
                        label={lieu.disponible ? "Available" : "Unavailable"}
                        dot
                      />
                    )}
                  </div>
                  {lieu.description && <p className="text-sm text-slate">{lieu.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{typeLieuLabels[lieu.type]}</span>
                    {lieu.exterieur && (
                      <span className="flex items-center gap-1">
                        <CloudSun className="size-3.5" aria-hidden />
                        Weather-dependent
                        {!lieu.coordonnees && " · no coordinates"}
                      </span>
                    )}
                    {lieu.capacite > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {lieu.capacite} people
                      </span>
                    )}
                    {lieu.coutSupplementaire > 0 && (
                      <span className="flex items-center gap-1">
                        <Banknote className="size-3.5" aria-hidden />
                        +{formatCurrency(lieu.coutSupplementaire)}
                      </span>
                    )}
                  </div>
                  {lieu.lieuxAlternatifs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Alternatives: {lieu.lieuxAlternatifs.map((a) => a.nom).join(", ")}
                    </p>
                  )}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Next 7 days</p>
                    <ol className="grid grid-cols-7 gap-1">
                      {WEEK.map((_, offset) => {
                        // +1 h: Tunis midnight is 23:00 UTC the day before; this lands inside the right UTC day.
                        const day = new Date(debut + offset * DAY_MS + 3_600_000);
                        const occupied = !lieu.disponible || busyDays[offset];
                        const weekday = (day.getUTCDay() + 6) % 7;
                        return (
                          <li
                            key={offset}
                            className={cn(
                              "rounded-md py-1 text-center text-[0.7rem] font-semibold",
                              occupied
                                ? "bg-destructive/10 text-destructive-text"
                                : "bg-success/10 text-success-text",
                            )}
                            title={occupied ? "Busy" : "Free"}
                          >
                            {WEEK[weekday]}
                            <span className="block font-normal">{day.getUTCDate()}</span>
                            <span className="sr-only">{occupied ? "busy" : "free"}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/lieux/${lieu.id}`}>
                          <Pencil aria-hidden />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
