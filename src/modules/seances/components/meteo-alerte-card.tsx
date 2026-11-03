"use client";

import { CalendarClock, CloudRain, Loader2, MapPin, ShieldCheck, Wind } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ActionResult } from "@/lib/action-result";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  appliquerLieuAlternatifMeteoAction,
  appliquerReportMeteoAction,
  maintenirSeanceMeteoAction,
  proposerOptionsMeteoAction,
} from "../meteo.actions";
import { decrireDepassement } from "../meteo.rules";
import type { AlerteMeteoDTO, PropositionsMeteoDTO, ResumePrevision } from "../meteo.types";

function ResumeLigne({ r }: { r: ResumePrevision }) {
  const items = [
    r.probabilitePluiePct != null ? `rain ${r.probabilitePluiePct}%` : null,
    r.pluieMm != null ? `${r.pluieMm} mm` : null,
    r.ventKmh != null ? `wind ${r.ventKmh} km/h` : null,
    r.temperatureMinC != null && r.temperatureMaxC != null
      ? `${r.temperatureMinC}–${r.temperatureMaxC} °C`
      : null,
  ].filter(Boolean);
  return <span className="text-xs text-muted-foreground">{items.join(" · ")}</span>;
}

type Pending = { title: string; description: string; label: string; run: () => Promise<ActionResult> };

/**
 * One open weather alert. The admin can look at the proposals (computed live), then validate
 * ONE of them or keep the session as planned. Every change goes through a confirmation.
 */
export function MeteoAlerteCard({ alerte }: { alerte: AlerteMeteoDTO }) {
  const router = useRouter();
  const [options, setOptions] = useState<PropositionsMeteoDTO | null>(null);
  const [loading, startLoad] = useTransition();
  const [busy, startApply] = useTransition();
  const [pending, setPending] = useState<Pending | null>(null);

  const chargerOptions = () =>
    startLoad(async () => {
      const result = await proposerOptionsMeteoAction(alerte.id);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      setOptions(result.data);
    });

  const confirmer = () => {
    if (!pending) return;
    startApply(async () => {
      const result = await pending.run();
      setPending(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Done");
      router.refresh();
    });
  };

  const aucune =
    options && options.reports.length === 0 && options.lieuxAlternatifs.length === 0;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/dashboard/seances/${alerte.seance.id}`}
            className="font-semibold text-foreground hover:underline"
          >
            {alerte.seance.titre}
          </Link>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden />
              {formatDateTime(alerte.seance.dateDebut)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {alerte.lieu.nom}
            </span>
          </p>
        </div>
        <ToneBadge tone="warning" label="Needs a decision" dot />
      </div>

      <div className="space-y-1.5">
        <ul className="flex flex-wrap gap-2">
          {alerte.depassements.map((d) => (
            <li
              key={d.critere}
              className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-text"
            >
              {d.critere === "VENT" ? (
                <Wind className="size-3.5" aria-hidden />
              ) : (
                <CloudRain className="size-3.5" aria-hidden />
              )}
              {decrireDepassement(d)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Forecast over the session: <ResumeLigne r={alerte.resume} /> · checked{" "}
          {formatDateTime(alerte.verifieLe)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={chargerOptions} disabled={loading || busy}>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {options ? "Refresh options" : "Show options"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading || busy}
          onClick={() =>
            setPending({
              title: "Keep this session as planned?",
              description: "The session is not changed and you will not be alerted again for this date and place.",
              label: "Keep as planned",
              run: () => maintenirSeanceMeteoAction(alerte.id),
            })
          }
        >
          <ShieldCheck aria-hidden />
          Keep as planned
        </Button>
      </div>

      {options && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          {aucune && (
            <p className="text-sm text-muted-foreground">
              No safe option right now
              {options.previsionsIndisponibles ? " (the forecast could not be read for this place)" : ""}: no
              alternative location is free and fine, and no day within the forecast has good weather with the
              team and place free. You can keep the session or change it by hand.
            </p>
          )}
          {options.lieuxAlternatifs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Move to another location</p>
              <ul className="space-y-2">
                {options.lieuxAlternatifs.map((o) => (
                  <li key={o.lieu.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{o.lieu.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.lieu.exterieur ? "Outdoor, forecast fine" : "Indoor"}
                        {o.lieu.coutSupplementaire > 0
                          ? ` · extra cost ${formatCurrency(o.lieu.coutSupplementaire)}`
                          : ""}
                      </p>
                      {o.resume && <ResumeLigne r={o.resume} />}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        setPending({
                          title: `Move to ${o.lieu.nom}?`,
                          description: `“${alerte.seance.titre}” will be held at ${o.lieu.nom} on the same date. The client is notified.${
                            o.lieu.coutSupplementaire > 0
                              ? ` Extra cost: ${formatCurrency(o.lieu.coutSupplementaire)} (to bill in Billing).`
                              : ""
                          }`,
                          label: "Move session",
                          run: () => appliquerLieuAlternatifMeteoAction({ alerteId: alerte.id, lieuId: o.lieu.id }),
                        })
                      }
                    >
                      Use this location
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {options.reports.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Postpone to another day (same time)</p>
              <ul className="space-y-2">
                {options.reports.map((o) => (
                  <li key={o.dateDebut} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{formatDateTime(o.dateDebut)}</p>
                      <ResumeLigne r={o.resume} />
                      <p className="text-xs text-muted-foreground">Team and location are free.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        setPending({
                          title: "Postpone this session?",
                          description: `“${alerte.seance.titre}” moves from ${formatDateTime(alerte.seance.dateDebut)} to ${formatDateTime(o.dateDebut)}. The client is notified. Check equipment reservations and tasks, they keep the old dates.`,
                          label: "Postpone session",
                          run: () => appliquerReportMeteoAction({ alerteId: alerte.id, dateDebut: o.dateDebut }),
                        })
                      }
                    >
                      Postpone here
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.label ?? "Confirm"}
        pending={busy}
        onConfirm={confirmer}
      />
    </Card>
  );
}
