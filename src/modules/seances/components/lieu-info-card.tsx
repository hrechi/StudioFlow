/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Banknote, CloudSun, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { findLieuById } from "../lieu.service";
import { typeLieuLabels } from "../lieu.types";

/**
 * Server component — rendered in the seance edit/detail page when a configured
 * location (lieuId) is linked to the session. Shows key location details,
 * outdoor warnings and alternatives at a glance.
 */
export async function LieuInfoCard({ lieuId }: { lieuId: string }) {
  const lieu = await findLieuById(lieuId);
  if (!lieu) return null;

  return (
    <Card className="gap-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Linked location</p>
          <p className="font-semibold text-foreground">{lieu.nom}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{lieu.adresse}</span>
          </p>
        </div>
        <ToneBadge
          tone={lieu.disponible ? "success" : "danger"}
          label={lieu.disponible ? "Available" : "Unavailable"}
          dot
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{typeLieuLabels[lieu.type]}</span>
        {lieu.exterieur && (
          <span className="flex items-center gap-1">
            <CloudSun className="size-3.5" aria-hidden />
            Weather-dependent
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
            +{formatCurrency(lieu.coutSupplementaire)} extra
          </span>
        )}
      </div>

      {lieu.exterieur && !lieu.coordonnees && (
        <p className="mt-2 text-xs font-medium text-warning-text">
          No coordinates — weather cannot be checked for this outdoor location.
        </p>
      )}

      {!lieu.disponible && lieu.lieuxAlternatifs.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Alternatives:</span>{" "}
          {lieu.lieuxAlternatifs.map((a) => a.nom).join(", ")}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/lieux/${lieu.id}`}>View location</Link>
        </Button>
      </div>
    </Card>
  );
}
