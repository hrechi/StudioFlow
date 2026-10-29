/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { CloudSun } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/guards";
import { formatDateTime } from "@/lib/utils";
import { MeteoAlerteCard } from "@/modules/seances/components/meteo-alerte-card";
import { MeteoSeuilsForm } from "@/modules/seances/components/meteo-seuils-form";
import { MeteoVerifierBouton } from "@/modules/seances/components/meteo-verifier-bouton";
import { listLieux } from "@/modules/seances/lieu.service";
import { decrireDepassement } from "@/modules/seances/meteo.rules";
import { getDerniereVerification, getSeuils, listAlertes } from "@/modules/seances/meteo.service";
import { statutAlerteMeteoConfig } from "@/modules/seances/meteo.types";

export const metadata: Metadata = { title: "Weather" };

export default async function MeteoPage() {
  await requireRole("ADMIN");
  const [seuils, { ouvertes, historique }, derniere, lieux] = await Promise.all([
    getSeuils(),
    listAlertes(),
    getDerniereVerification(),
    listLieux(),
  ]);
  const sansCoordonnees = lieux.filter((l) => l.exterieur && !l.coordonnees);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weather watch"
        description="Forecasts of your outdoor sessions. You decide: nothing is moved without your confirmation."
        actions={<MeteoVerifierBouton />}
      />

      {!seuils.actif && (
        <Card role="status" className="border-warning/40 bg-warning/5 p-4 text-sm text-warning-text">
          The weather watch is off: no forecast is read. Turn it on in the thresholds below.
        </Card>
      )}
      {sansCoordonnees.length > 0 && (
        <Card role="status" className="border-warning/40 bg-warning/5 p-4 text-sm text-warning-text">
          These outdoor locations have no coordinates, so their sessions cannot be checked:{" "}
          {sansCoordonnees.map((l, i) => (
            <span key={l.id}>
              {i > 0 && ", "}
              <Link href={`/dashboard/lieux/${l.id}`} className="font-medium underline">
                {l.nom}
              </Link>
            </span>
          ))}
          .
        </Card>
      )}

      <section aria-labelledby="alertes" className="space-y-3">
        <h2 id="alertes" className="font-semibold text-foreground">
          Open alerts ({ouvertes.length})
        </h2>
        {ouvertes.length === 0 ? (
          <EmptyState
            icon={CloudSun}
            title="No weather alert"
            description={
              derniere
                ? `Last check ${formatDateTime(derniere.le)}: ${derniere.seancesVerifiees} outdoor session(s) looked at.`
                : "No check has run yet. Use “Check forecasts now”, or schedule /api/meteo/verification."
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ouvertes.map((a) => (
              <MeteoAlerteCard key={a.id} alerte={a} />
            ))}
          </div>
        )}
      </section>

      <MeteoSeuilsForm seuils={seuils} />

      {historique.length > 0 && (
        <section aria-labelledby="historique" className="space-y-3">
          <h2 id="historique" className="font-semibold text-foreground">
            Recent decisions
          </h2>
          <Card className="divide-y p-0">
            {historique.map((a) => (
              <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-foreground">
                    {a.seance.titre}{" "}
                    <span className="font-normal text-muted-foreground">· {a.lieu.nom}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.decision
                      ? a.decision.detail
                      : a.depassements.map(decrireDepassement).join("; ") || "Forecast back within the limits."}
                  </p>
                </div>
                <ToneBadge
                  tone={statutAlerteMeteoConfig[a.statut].tone}
                  label={statutAlerteMeteoConfig[a.statut].label}
                />
              </div>
            ))}
          </Card>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Weather data by{" "}
        <a href="https://open-meteo.com/" className="underline" target="_blank" rel="noreferrer">
          Open-Meteo.com
        </a>{" "}
        (CC BY 4.0).
      </p>
    </div>
  );
}
