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
import { Switch } from "@/components/ui/switch";
import { saveSeuilsMeteoAction } from "../meteo.actions";
import { seuilsMeteoSchema, type SeuilsMeteoInput } from "../meteo.schemas";
import type { SeuilsMeteo } from "../meteo.types";

export function MeteoSeuilsForm({ seuils }: { seuils: SeuilsMeteo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SeuilsMeteoInput>({
    resolver: zodResolver(seuilsMeteoSchema) as unknown as Resolver<SeuilsMeteoInput>,
    defaultValues: seuils,
  });
  const { errors } = form.formState;
  const err = (name: keyof SeuilsMeteoInput) => errors[name]?.message as string | undefined;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveSeuilsMeteoAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Weather thresholds saved");
      router.refresh();
    }),
  );

  const num = (name: keyof Omit<SeuilsMeteoInput, "actif">) =>
    form.register(name, { valueAsNumber: true });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-foreground">Thresholds</h2>
          <p className="text-xs text-muted-foreground">
            An outdoor session is flagged as soon as one of these limits is crossed in its forecast.
          </p>
        </div>
        <Controller
          control={form.control}
          name="actif"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium text-foreground">Weather watch on</span>
                <span className="block text-xs text-muted-foreground">
                  When off, no forecast is read and no alert is opened.
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="pluieProbabiliteMax" label="Max rain probability (%)" error={err("pluieProbabiliteMax")}>
            <IconInput id="pluieProbabiliteMax" type="number" min={0} max={100} {...num("pluieProbabiliteMax")} />
          </FormField>
          <FormField id="pluieMmMax" label="Max rainfall (mm)" error={err("pluieMmMax")}>
            <IconInput id="pluieMmMax" type="number" min={0} step="0.1" {...num("pluieMmMax")} />
          </FormField>
          <FormField id="ventKmhMax" label="Max wind (km/h)" error={err("ventKmhMax")}>
            <IconInput id="ventKmhMax" type="number" min={0} {...num("ventKmhMax")} />
          </FormField>
          <FormField id="temperatureMinC" label="Min temperature (°C)" error={err("temperatureMinC")}>
            <IconInput id="temperatureMinC" type="number" step="0.5" {...num("temperatureMinC")} />
          </FormField>
          <FormField id="temperatureMaxC" label="Max temperature (°C)" error={err("temperatureMaxC")}>
            <IconInput id="temperatureMaxC" type="number" step="0.5" {...num("temperatureMaxC")} />
          </FormField>
          <FormField
            id="horizonJours"
            label="Look ahead (days)"
            error={err("horizonJours")}
            hint="Forecasts get less reliable beyond a week."
          >
            <IconInput id="horizonJours" type="number" min={1} max={14} {...num("horizonJours")} />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save thresholds
          </Button>
        </div>
      </Card>
    </form>
  );
}
