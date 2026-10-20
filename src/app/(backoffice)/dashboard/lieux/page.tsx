/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { MapPin, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PageHeader } from "@/components/shared/page-header";
import { SafeImage } from "@/components/shared/safe-image";
import { ToneBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { cn } from "@/lib/utils";
import { LIEUX, SEANCES } from "@/modules/seances/mock-data";
import { typeLieuLabels } from "@/modules/seances/seance.types";

export const metadata: Metadata = { title: "Locations" };

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export default async function LieuxPage() {
  await requireArea("seances");

  // Availability for the next 7 days, from the (mock) séances.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const busy = (lieuId: string, offset: number) =>
    SEANCES.some((s) => {
      if (s.lieu.id !== lieuId || s.statut === "ANNULEE") return false;
      const day = new Date(s.dateDebut);
      day.setHours(0, 0, 0, 0);
      return Math.round((day.getTime() - today.getTime()) / 86_400_000) === offset;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shooting locations"
        description="Studios, outdoor spots and on-site sessions, with their availability."
        actions={
          <ComingSoonButton feature="Add a location">
            <Plus aria-hidden />
            New location
          </ComingSoonButton>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LIEUX.map((lieu) => (
          <Card key={lieu.id} className="gap-0 overflow-hidden py-0">
            <div className="relative h-40">
              <SafeImage
                src={lieu.photo}
                alt=""
                fill
                sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute top-3 left-3">
                <ToneBadge
                  tone={lieu.disponible ? "success" : "danger"}
                  label={lieu.disponible ? "Available" : "Unavailable"}
                  dot
                  className="bg-card"
                />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-foreground">{lieu.nom}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {lieu.adresse}
                </p>
              </div>
              <p className="text-sm text-slate">{lieu.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{typeLieuLabels[lieu.type]}</span>
                {lieu.capacite > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden />
                    {lieu.capacite} people
                  </span>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Next 7 days</p>
                <ol className="grid grid-cols-7 gap-1">
                  {WEEK.map((_, offset) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() + offset);
                    const occupied = !lieu.disponible || busy(lieu.id, offset);
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
                        {WEEK[(date.getDay() + 6) % 7]}
                        <span className="block font-normal">{date.getDate()}</span>
                        <span className="sr-only">{occupied ? "busy" : "free"}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
