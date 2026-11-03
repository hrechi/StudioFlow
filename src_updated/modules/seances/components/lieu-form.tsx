"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createLieuAction, deleteLieuAction, updateLieuAction } from "../lieu.actions";
import { lieuSchema, type LieuInput } from "../lieu.schemas";
import {
  LIEUX_ALTERNATIFS_MAX,
  TYPES_LIEU,
  typeLieuLabels,
  type LieuDTO,
  type LieuRef,
} from "../lieu.types";

export function LieuForm({ lieu, autres }: { lieu?: LieuDTO; autres: LieuRef[] }) {
  const editing = !!lieu;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<LieuInput>({
    resolver: zodResolver(lieuSchema) as unknown as Resolver<LieuInput>,
    defaultValues: {
      nom: lieu?.nom ?? "",
      adresse: lieu?.adresse ?? "",
      description: lieu?.description ?? "",
      type: lieu?.type ?? "STUDIO",
      exterieur: lieu?.exterieur ?? false,
      capacite: lieu?.capacite ?? 0,
      disponible: lieu?.disponible ?? true,
      latitude: lieu?.coordonnees ? String(lieu.coordonnees.latitude) : "",
      longitude: lieu?.coordonnees ? String(lieu.coordonnees.longitude) : "",
      coutSupplementaire: lieu?.coutSupplementaire ?? 0,
      lieuxAlternatifsIds: lieu?.lieuxAlternatifs.map((a) => a.id) ?? [],
    },
  });
  const { errors } = form.formState;
  const exterieur = form.watch("exterieur");
  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");
  const err = (name: keyof LieuInput) => errors[name]?.message as string | undefined;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = editing
        ? await updateLieuAction(lieu.id, values)
        : await createLieuAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Location saved" : "Location created");
      if (editing) router.refresh();
      else router.push("/dashboard/lieux");
    });
  });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteLieuAction(lieu!.id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Location deleted");
      router.push("/dashboard/lieux");
    });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="nom" label="Name" required error={err("nom")}>
            <IconInput
              id="nom"
              placeholder="Carthage seafront"
              invalid={!!errors.nom}
              aria-describedby={describedBy("nom", err("nom"))}
              {...form.register("nom")}
            />
          </FormField>
          <FormField id="type" label="Type" required error={err("type")}>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Handy default: an outdoor type is outdoors, a studio is not. Still editable.
                    if (value === "EXTERIEUR") form.setValue("exterieur", true, { shouldDirty: true });
                    if (value === "STUDIO") form.setValue("exterieur", false, { shouldDirty: true });
                  }}
                >
                  <SelectTrigger id="type" className="h-10 w-full bg-card">
                    <SelectValue>{typeLieuLabels[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_LIEU.map((t) => (
                      <SelectItem key={t} value={t}>
                        {typeLieuLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField id="adresse" label="Address" required error={err("adresse")}>
          <IconInput id="adresse" placeholder="Carthage, Tunis" {...form.register("adresse")} />
        </FormField>
        <FormField id="description" label="Description" error={err("description")}>
          <Textarea id="description" rows={3} {...form.register("description")} />
        </FormField>
        <FormField
          id="capacite"
          label="Capacity (people)"
          error={err("capacite")}
          hint="0 = not specified"
          className="sm:max-w-xs"
        >
          <IconInput
            id="capacite"
            type="number"
            min={0}
            {...form.register("capacite", { valueAsNumber: true })}
          />
        </FormField>
        <Controller
          control={form.control}
          name="disponible"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium text-foreground">Available for sessions</span>
                <span className="block text-xs text-muted-foreground">
                  When off, the location can no longer be chosen for a new session.
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">Weather & alternatives</h2>
        <Controller
          control={form.control}
          name="exterieur"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium text-foreground">Outdoor location</span>
                <span className="block text-xs text-muted-foreground">
                  The weather forecast is checked for sessions held here.
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="latitude" label="Latitude" error={err("latitude")} hint="e.g. 36.8529">
            <IconInput
              id="latitude"
              inputMode="decimal"
              placeholder="36.8529"
              invalid={!!errors.latitude}
              {...form.register("latitude")}
            />
          </FormField>
          <FormField id="longitude" label="Longitude" error={err("longitude")} hint="e.g. 10.3231">
            <IconInput
              id="longitude"
              inputMode="decimal"
              placeholder="10.3231"
              invalid={!!errors.longitude}
              {...form.register("longitude")}
            />
          </FormField>
        </div>
        {exterieur && (!latitude.trim() || !longitude.trim()) && (
          <p role="status" className="text-xs font-medium text-warning-text">
            Add the coordinates: without them the weather cannot be checked for this outdoor location.
          </p>
        )}
        <FormField
          id="coutSupplementaire"
          label="Extra cost (TND)"
          error={err("coutSupplementaire")}
          hint="Added when a session is held here (travel, permit, rental…). 0 = none."
          className="sm:max-w-xs"
        >
          <IconInput
            id="coutSupplementaire"
            type="number"
            min={0}
            step="1"
            {...form.register("coutSupplementaire", { valueAsNumber: true })}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate">Alternative locations</p>
          <p className="text-xs text-muted-foreground">
            Offered to the admin when this place cannot be used (bad weather…). Up to {LIEUX_ALTERNATIFS_MAX}.
          </p>
          {errors.lieuxAlternatifsIds?.message && (
            <p role="alert" className="text-xs font-medium text-destructive-text">
              {errors.lieuxAlternatifsIds.message as string}
            </p>
          )}
          {autres.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other location yet.</p>
          ) : (
            <Controller
              control={form.control}
              name="lieuxAlternatifsIds"
              render={({ field }) => (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {autres.map((a) => {
                    const checked = field.value.includes(a.id);
                    const full = !checked && field.value.length >= LIEUX_ALTERNATIFS_MAX;
                    return (
                      <li key={a.id}>
                        <label className="flex items-center gap-3 rounded-lg border bg-card p-2.5 text-sm">
                          <Checkbox
                            checked={checked}
                            disabled={full}
                            onCheckedChange={(on) =>
                              field.onChange(
                                on === true
                                  ? [...field.value, a.id]
                                  : field.value.filter((id) => id !== a.id),
                              )
                            }
                          />
                          <span className="min-w-0 flex-1 truncate">{a.nom}</span>
                          <span className="text-xs text-muted-foreground">
                            {a.exterieur ? "Outdoor" : "Indoor"}
                            {a.disponible ? "" : " · disabled"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            />
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2 aria-hidden />
            Delete location
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Create location"}
          </Button>
        </div>
      </div>

      {editing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          tone="destructive"
          title={`Delete "${lieu.nom}"?`}
          description={
            lieu.nombreSeances > 0
              ? `${lieu.nombreSeances} session(s) use this location, so it cannot be deleted. Turn off “Available for sessions” instead.`
              : "The location is removed, and also from the alternatives of the other locations."
          }
          confirmLabel="Delete"
          pending={pending}
          onConfirm={remove}
        />
      )}
    </form>
  );
}
