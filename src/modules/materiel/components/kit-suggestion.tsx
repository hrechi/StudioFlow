"use client";

import { History, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AIBadge } from "@/components/shared/ai-badge";
import { AIConfidence, AIPanel } from "@/components/shared/ai-panel";
import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { suggestKitAction } from "../kit.actions";
import { categorieMaterielLabels, type KitSuggereDTO } from "../materiel.types";
import { createReservationsAction } from "../reservation-materiel.actions";
import type { SeanceReservableDTO } from "../seance-source";

/**
 * Suggested kit for a session: the AI (or the history fallback) proposes, the user unticks what
 * they do not want, then reserves the rest over the session's dates.
 */
export function KitSuggestion({ seances }: { seances: SeanceReservableDTO[] }) {
  const router = useRouter();
  const [seanceId, setSeanceId] = useState(seances[0]?.id ?? "");
  const [kit, setKit] = useState<KitSuggereDTO | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [refus, setRefus] = useState<Record<string, string>>({});
  const [suggesting, startSuggest] = useTransition();
  const [reserving, startReserve] = useTransition();

  const suggerer = () =>
    startSuggest(async () => {
      const result = await suggestKitAction(seanceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setKit(result.data);
      setCoches(new Set(result.data.items.map((i) => i.materielId)));
      setRefus({});
      if (result.data.items.length === 0) toast.info("No equipment to suggest for this session.");
    });

  const reserver = () => {
    if (!kit) return;
    const materielIds = kit.items.map((i) => i.materielId).filter((id) => coches.has(id));
    startReserve(async () => {
      const result = await createReservationsAction({
        seanceId: kit.seance.id,
        materielIds,
        dateDebut: kit.seance.dateDebut,
        dateFin: kit.seance.dateFin,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const reservees = new Set(result.data.filter((r) => r.ok).map((r) => r.materielId));
      const refusees = Object.fromEntries(
        result.data.flatMap((r) => (r.ok ? [] : [[r.materielId, r.error]])),
      );
      if (reservees.size > 0) router.refresh();
      setRefus(refusees);
      // Reserved items leave the kit; refused ones stay, with their reason.
      setKit({ ...kit, items: kit.items.filter((i) => !reservees.has(i.materielId)) });
      setCoches(new Set([...coches].filter((id) => !reservees.has(id))));
      if (Object.keys(refusees).length === 0) {
        toast.success(`Kit reserved: ${reservees.size} item${reservees.size > 1 ? "s" : ""}`);
      } else if (reservees.size > 0) {
        toast.warning(
          `${reservees.size} of ${result.data.length} items reserved — see the refusals.`,
        );
      } else {
        toast.error("No item could be reserved.");
      }
    });
  };

  const toggle = (id: string, on: boolean) =>
    setCoches((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const busy = suggesting || reserving;
  const selection = kit?.items.filter((i) => coches.has(i.materielId)).length ?? 0;

  return (
    <AIPanel
      title="Suggested kit"
      description="Pick a session: the AI proposes a kit from the free equipment and past sessions of the same type. You decide what to reserve."
      footer={
        kit && kit.items.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {kit.source === "IA" && kit.confiance !== undefined ? (
              <AIConfidence value={kit.confiance} />
            ) : (
              <span className="text-xs text-muted-foreground">Based on past reservations</span>
            )}
            <Button size="sm" variant="ai" onClick={reserver} disabled={busy || selection === 0}>
              {reserving ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Sparkles aria-hidden />
              )}
              Reserve the suggested kit ({selection})
            </Button>
          </div>
        ) : undefined
      }
    >
      {seances.length === 0 ? (
        <p className="text-sm text-muted-foreground">There is no upcoming session to equip.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={seanceId} onValueChange={setSeanceId} disabled={busy}>
              <SelectTrigger className="h-9 min-w-0 flex-1 bg-card" aria-label="Session">
                <SelectValue placeholder="Choose a session">
                  {seances.find((s) => s.id === seanceId)?.titre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {seances.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex flex-col">
                      <span>{s.titre}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.typeEvenement} · {formatDateTime(s.dateDebut)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ai-soft"
              className="h-9"
              onClick={suggerer}
              disabled={busy || !seanceId}
            >
              {suggesting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Sparkles aria-hidden />
              )}
              Suggest kit
            </Button>
          </div>

          {suggesting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Analysing the free equipment and past sessions…
            </p>
          )}

          {kit && !suggesting && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {kit.source === "IA" ? (
                  <AIBadge label="Suggested by AI" />
                ) : (
                  <ToneBadge tone="neutral" label="From history (AI unavailable)" />
                )}
                <span className="truncate">
                  {kit.seance.typeEvenement} · {formatDateTime(kit.seance.dateDebut)}
                </span>
              </div>
              {kit.items.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <History className="size-4" aria-hidden />
                  Nothing left to suggest for this session.
                </p>
              ) : (
                <ul className="space-y-2">
                  {kit.items.map((item) => {
                    const inputId = `kit-${item.materielId}`;
                    const erreur = refus[item.materielId];
                    return (
                      <li
                        key={item.materielId}
                        className="rounded-lg bg-card p-2.5 ring-1 ring-ai/10"
                      >
                        <div className="flex gap-3">
                          <Checkbox
                            id={inputId}
                            className="mt-0.5"
                            checked={coches.has(item.materielId)}
                            disabled={busy}
                            onCheckedChange={(on) => toggle(item.materielId, on === true)}
                          />
                          <label htmlFor={inputId} className="min-w-0 cursor-pointer">
                            <span className="block text-sm font-semibold text-foreground">
                              {item.nom}{" "}
                              <span className="font-normal text-muted-foreground">
                                · {categorieMaterielLabels[item.categorie]}
                              </span>
                            </span>
                            <span className="block text-xs text-slate">{item.raison}</span>
                          </label>
                        </div>
                        {erreur && (
                          <p
                            role="alert"
                            className="mt-1 pl-7 text-xs font-medium text-destructive-text"
                          >
                            {erreur}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </AIPanel>
  );
}
