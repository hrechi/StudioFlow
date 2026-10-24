"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { CataloguePublicDTO } from "../catalogue.types";
import { createReservationAction } from "../reservation.actions";
import { reservationSchema, type ReservationInput } from "../reservation.schemas";

export function ReservationRequestForm({
  catalogue,
  defaultPackId,
}: {
  catalogue: CataloguePublicDTO;
  defaultPackId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const packs = catalogue.flatMap((c) => c.packs.map((p) => ({ ...p, type: c.type.nom })));
  const initial = packs.some((p) => p.id === defaultPackId) ? defaultPackId! : "";

  const form = useForm<ReservationInput>({
    resolver: zodResolver(reservationSchema) as unknown as Resolver<ReservationInput>,
    defaultValues: { packId: initial, dateDebut: "", lieu: "", message: "" },
  });
  const { errors } = form.formState;
  const selected = packs.find((p) => p.id === form.watch("packId"));
  const min = new Date(Date.now() + 24 * 3_600_000 - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, dateDebut: new Date(values.dateDebut).toISOString() };
    startTransition(async () => {
      const result = await createReservationAction(payload);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Request sent. The studio will confirm shortly.");
      router.push("/espace-client/seances");
    });
  });

  if (packs.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No pack is available for online booking right now. Please contact the studio.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField id="packId" label="Pack" required error={errors.packId?.message}>
          <Controller control={form.control} name="packId" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="packId" className="h-10 w-full bg-card">
                <SelectValue placeholder="Choose a pack">
                  {selected ? `${selected.type} · ${selected.nom}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {catalogue.map((c) => (
                  <SelectGroup key={c.type.id}>
                    <SelectLabel>{c.type.nom}</SelectLabel>
                    {c.packs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom}{p.prix !== null ? ` — ${formatCurrency(p.prix)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        {selected && (
          <p className="text-xs text-muted-foreground">
            Includes: {selected.prestations.map((l) => l.nom).join(", ")}.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="dateDebut" label="Preferred date and time" required error={errors.dateDebut?.message}
            hint="At least 24 hours from now. The studio confirms the final slot.">
            <IconInput id="dateDebut" type="datetime-local" min={min} {...form.register("dateDebut")} />
          </FormField>
          <FormField id="lieu" label="Location" required error={errors.lieu?.message}>
            <IconInput id="lieu" placeholder="Venue or address" {...form.register("lieu")} />
          </FormField>
        </div>
        <FormField id="message" label="Message for the studio" error={errors.message?.message}>
          <Textarea id="message" rows={3} placeholder="Number of guests, style, special requests…" {...form.register("message")} />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Send my request
          </Button>
        </div>
      </form>
    </Card>
  );
}
