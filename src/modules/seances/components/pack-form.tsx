"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { PackAiSuggestions } from "./pack-ai-suggestions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createPackAction, deletePackAction, updatePackAction } from "../catalogue.actions";
import { packSchema, type PackInput } from "../catalogue.schemas";
import {
  STATUTS_PACK,
  statutPackConfig,
  type PackDTO,
  type PrestationDTO,
  type TypeEvenementDTO,
} from "../catalogue.types";

export function PackForm({
  pack,
  types,
  prestations,
  defaultTypeId,
}: {
  pack?: PackDTO;
  types: TypeEvenementDTO[];
  prestations: PrestationDTO[];
  defaultTypeId?: string;
}) {
  const editing = !!pack;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<PackInput>({
    resolver: zodResolver(packSchema) as unknown as Resolver<PackInput>,
    defaultValues: {
      nom: pack?.nom ?? "",
      typeEvenementId: pack?.typeEvenement.id ?? defaultTypeId ?? "",
      description: pack?.description ?? "",
      prix: pack?.prix ?? 0,
      afficherPrix: pack?.afficherPrix ?? true,
      dureeEstimeeMinutes: pack?.dureeEstimeeMinutes ?? 0,
      statut: pack?.statut ?? "BROUILLON",
      prestations:
        pack?.prestations.map((l) => ({
          prestationId: l.prestationId,
          quantite: l.quantite,
          conditions: l.conditions ?? "",
        })) ?? [],
      options: pack?.options.map((o) => ({ ...o, description: o.description ?? "" })) ?? [],
    },
  });
  const { errors } = form.formState;
  const lines = useFieldArray({ control: form.control, name: "prestations" });
  const options = useFieldArray({ control: form.control, name: "options" });
  const prestationById = new Map(prestations.map((p) => [p.id, p]));

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = editing
        ? await updatePackAction(pack.id, values)
        : await createPackAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Pack saved" : "Pack created");
      if (editing) router.refresh();
      else router.push("/dashboard/catalogue/packs");
    });
  });

  const remove = () =>
    startTransition(async () => {
      const result = await deletePackAction(pack!.id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Pack deleted");
      router.push("/dashboard/catalogue/packs");
    });

  const err = (name: keyof PackInput) => errors[name]?.message as string | undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="nom" label="Pack name" required error={err("nom")}>
            <IconInput
              id="nom"
              placeholder="Signature"
              invalid={!!errors.nom}
              aria-describedby={describedBy("nom", err("nom"))}
              {...form.register("nom")}
            />
          </FormField>
          <FormField id="typeEvenementId" label="Event type" required error={err("typeEvenementId")}>
            <Controller
              control={form.control}
              name="typeEvenementId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="typeEvenementId" className="h-10 w-full bg-card">
                    <SelectValue placeholder="Choose a type">
                      {types.find((t) => t.id === field.value)?.nom}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => {
                      const full = t.nombrePacks >= t.maxPacks && t.id !== pack?.typeEvenement.id;
                      return (
                        <SelectItem key={t.id} value={t.id} disabled={full}>
                          {t.nom} · {t.nombrePacks}/{t.maxPacks}
                          {full ? " (full)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField
          id="description"
          label="Description"
          error={err("description")}
          hint="Required (10+ characters) to publish."
        >
          <Textarea id="description" rows={4} {...form.register("description")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="prix" label="Price (TND)" required error={err("prix")}>
            <IconInput
              id="prix"
              type="number"
              min={0}
              step="1"
              {...form.register("prix", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            id="dureeEstimeeMinutes"
            label="Estimated duration (min)"
            error={err("dureeEstimeeMinutes")}
            hint="0 = not specified"
          >
            <IconInput
              id="dureeEstimeeMinutes"
              type="number"
              min={0}
              {...form.register("dureeEstimeeMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="statut" label="Status" required error={err("statut")}>
            <Controller
              control={form.control}
              name="statut"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="statut" className="h-10 w-full bg-card">
                    <SelectValue>{statutPackConfig[field.value].label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_PACK.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statutPackConfig[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <Controller
          control={form.control}
          name="afficherPrix"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium text-foreground">Show the price on the site</span>
                <span className="block text-xs text-muted-foreground">
                  When off, visitors see "on quote" and the chatbot will not quote a price.
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Included services</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => lines.append({ prestationId: "", quantite: 1, conditions: "" })}
          >
            <Plus aria-hidden />
            Add a service
          </Button>
        </div>
        {err("prestations") && (
          <p role="alert" className="text-xs font-medium text-destructive-text">
            {err("prestations")}
          </p>
        )}
        {(errors.prestations as { root?: { message?: string } } | undefined)?.root?.message && (
          <p role="alert" className="text-xs font-medium text-destructive-text">
            {(errors.prestations as { root: { message: string } }).root.message}
          </p>
        )}
        {lines.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No service yet.</p>
        )}
        {lines.fields.map((field, index) => {
          const selected = form.watch(`prestations.${index}.prestationId`);
          const unite = prestationById.get(selected)?.unite;
          const taken = new Set(form.watch("prestations").map((l) => l.prestationId));
          return (
            <div key={field.id} className="grid items-start gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
              <FormField
                id={`prestations.${index}.prestationId`}
                label="Service"
                error={errors.prestations?.[index]?.prestationId?.message}
              >
                <Controller
                  control={form.control}
                  name={`prestations.${index}.prestationId`}
                  render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger className="h-10 w-full bg-card">
                        <SelectValue placeholder="Choose…">
                          {prestationById.get(f.value)?.nom}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {prestations.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={(!p.actif && p.id !== f.value) || (taken.has(p.id) && p.id !== f.value)}
                          >
                            {p.nom}
                            {!p.actif ? " (inactive)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                id={`prestations.${index}.quantite`}
                label={unite ? `Quantity (${unite})` : "Quantity"}
                error={errors.prestations?.[index]?.quantite?.message}
              >
                <IconInput
                  id={`prestations.${index}.quantite`}
                  type="number"
                  min={1}
                  {...form.register(`prestations.${index}.quantite`, { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                id={`prestations.${index}.conditions`}
                label="Conditions"
                error={errors.prestations?.[index]?.conditions?.message}
              >
                <IconInput
                  id={`prestations.${index}.conditions`}
                  placeholder="e.g. delivered within 3 weeks"
                  {...form.register(`prestations.${index}.conditions`)}
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label="Remove this service"
                onClick={() => lines.remove(index)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        })}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Extra options</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => options.append({ nom: "", prix: 0, description: "" })}
          >
            <Plus aria-hidden />
            Add an option
          </Button>
        </div>
        {options.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Optional add-ons the client can request.</p>
        )}
        {options.fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <FormField
              id={`options.${index}.nom`}
              label="Option"
              error={errors.options?.[index]?.nom?.message}
            >
              <IconInput id={`options.${index}.nom`} {...form.register(`options.${index}.nom`)} />
            </FormField>
            <FormField
              id={`options.${index}.prix`}
              label="Price (TND)"
              error={errors.options?.[index]?.prix?.message}
            >
              <IconInput
                id={`options.${index}.prix`}
                type="number"
                min={0}
                {...form.register(`options.${index}.prix`, { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              id={`options.${index}.description`}
              label="Description"
              error={errors.options?.[index]?.description?.message}
            >
              <IconInput
                id={`options.${index}.description`}
                {...form.register(`options.${index}.description`)}
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6"
              aria-label="Remove this option"
              onClick={() => options.remove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
      </Card>

      <PackAiSuggestions form={form} packId={pack?.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2 aria-hidden />
            Delete pack
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
            {editing ? "Save changes" : "Create pack"}
          </Button>
        </div>
      </div>

      {editing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          tone="destructive"
          title={`Delete "${pack.nom}"?`}
          description="The pack disappears from the site and frees a slot in its event type. To keep it, disable it instead."
          confirmLabel="Delete"
          pending={pending}
          onConfirm={remove}
        />
      )}
    </form>
  );
}
