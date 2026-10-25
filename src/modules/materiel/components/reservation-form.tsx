"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarX2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField, IconInput } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateTime } from "@/lib/utils";
import { categorieMaterielLabels, type Materiel } from "../materiel.types";
import { createReservationsAction } from "../reservation-materiel.actions";
import { reservationsSchema, type ReservationsInput } from "../reservation-materiel.schemas";
import type { SeanceReservableDTO } from "../seance-source";

/** ISO → value of an <input type="datetime-local"> (local time). */
const toLocal = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** Why an item cannot be picked (null = it can). Conflicts are checked by the server. */
function indisponibilite(m: Materiel): string | null {
  if (m.archive) return "Archived";
  if (m.etat === "EN_PANNE") return "Out of order";
  if (!m.disponible) return "Unavailable";
  return null;
}

/**
 * New reservation: one séance, its dates (prefilled, editable) and one or more items.
 * Each item gets its own result; the reserved ones leave the selection.
 */
export function ReservationFormDialog({
  seances,
  materiels,
  materielId,
  trigger,
}: {
  seances: SeanceReservableDTO[];
  materiels: Materiel[];
  /** Pre-selected item (from the equipment page). */
  materielId?: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const defaults = (): ReservationsInput => ({
    seanceId: "",
    materielIds: materielId ? [materielId] : [],
    dateDebut: "",
    dateFin: "",
  });
  const form = useForm<ReservationsInput>({
    resolver: zodResolver(reservationsSchema) as unknown as Resolver<ReservationsInput>,
    defaultValues: defaults(),
  });
  const { errors } = form.formState;

  const chooseSeance = (id: string, onChange: (value: string) => void) => {
    onChange(id);
    const seance = seances.find((s) => s.id === id);
    if (!seance) return;
    form.setValue("dateDebut", toLocal(seance.dateDebut), { shouldValidate: true });
    form.setValue("dateFin", toLocal(seance.dateFin), { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      ...values,
      dateDebut: new Date(values.dateDebut).toISOString(),
      dateFin: new Date(values.dateFin).toISOString(),
    };
    startTransition(async () => {
      const result = await createReservationsAction(payload);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      const reussies = result.data.filter((r) => r.ok);
      const refusees = Object.fromEntries(
        result.data.flatMap((r) => (r.ok ? [] : [[r.materielId, r.error]])),
      );
      if (reussies.length > 0) router.refresh();
      if (Object.keys(refusees).length === 0) {
        toast.success(
          reussies.length > 1
            ? `${reussies.length} items reserved`
            : `${reussies[0].materielNom} reserved`,
        );
        setOpen(false);
        return;
      }
      setItemErrors(refusees);
      form.setValue(
        "materielIds",
        values.materielIds.filter((id) => id in refusees),
      );
      if (reussies.length > 0) {
        toast.warning(
          `${reussies.length} of ${result.data.length} items reserved — see the refusals.`,
        );
      } else {
        toast.error("No item could be reserved.");
      }
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          form.reset(defaults());
          setItemErrors({});
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New reservation</DialogTitle>
          <DialogDescription>
            Reserve one or more items for a session. Overlapping reservations are refused.
          </DialogDescription>
        </DialogHeader>
        {seances.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No upcoming session"
            description="There is no session left to reserve equipment for."
          />
        ) : (
          <form
            id="reservation-form"
            onSubmit={onSubmit}
            noValidate
            className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"
          >
            <FormField id="seanceId" label="Session" required error={errors.seanceId?.message}>
              <Controller
                control={form.control}
                name="seanceId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => chooseSeance(v, field.onChange)}
                  >
                    <SelectTrigger id="seanceId" className="h-10 w-full bg-card">
                      <SelectValue placeholder="Choose a session">
                        {seances.find((s) => s.id === field.value)?.titre}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {seances.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex flex-col">
                            <span>{s.titre}</span>
                            <span className="text-xs text-muted-foreground">
                              {s.typeEvenement} · {formatDateTime(s.dateDebut)} · {s.clientNom}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="dateDebut" label="Start" required error={errors.dateDebut?.message}>
                <IconInput
                  id="dateDebut"
                  type="datetime-local"
                  invalid={!!errors.dateDebut}
                  {...form.register("dateDebut")}
                />
              </FormField>
              <FormField id="dateFin" label="End" required error={errors.dateFin?.message}>
                <IconInput
                  id="dateFin"
                  type="datetime-local"
                  invalid={!!errors.dateFin}
                  {...form.register("dateFin")}
                />
              </FormField>
            </div>
            <FormField
              id="materielIds"
              label="Equipment"
              required
              error={errors.materielIds?.message ?? errors.materielIds?.root?.message}
            >
              <Controller
                control={form.control}
                name="materielIds"
                render={({ field }) => (
                  <ul
                    id="materielIds"
                    className="divide-y rounded-lg border bg-card"
                    aria-label="Equipment to reserve"
                  >
                    {materiels.map((m) => {
                      const raison = indisponibilite(m);
                      const checked = field.value.includes(m.id);
                      const error = itemErrors[m.id];
                      const inputId = `materiel-${m.id}`;
                      return (
                        <li key={m.id} className={cn("px-3 py-2.5", raison && "opacity-60")}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={inputId}
                              checked={checked}
                              disabled={!!raison}
                              aria-invalid={!!error || undefined}
                              aria-describedby={error ? `${inputId}-error` : undefined}
                              onCheckedChange={(on) =>
                                field.onChange(
                                  on
                                    ? [...field.value, m.id]
                                    : field.value.filter((id) => id !== m.id),
                                )
                              }
                            />
                            <label htmlFor={inputId} className="min-w-0 flex-1 text-sm">
                              <span className="font-medium text-foreground">{m.nom}</span>{" "}
                              <span className="text-muted-foreground">
                                · {categorieMaterielLabels[m.categorie]}
                              </span>
                            </label>
                            {raison && (
                              <span className="text-xs text-muted-foreground">{raison}</span>
                            )}
                          </div>
                          {error && (
                            <p
                              id={`${inputId}-error`}
                              role="alert"
                              className="mt-1 pl-7 text-xs font-medium text-destructive-text"
                            >
                              {error}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              />
            </FormField>
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="reservation-form" disabled={pending || seances.length === 0}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Reserve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
