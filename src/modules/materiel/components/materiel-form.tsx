"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { createMaterielAction, updateMaterielAction } from "../materiel.actions";
import { materielSchema, type MaterielInput } from "../materiel.schemas";
import {
  CATEGORIES_MATERIEL,
  ETATS_MATERIEL,
  categorieMaterielLabels,
  etatMaterielConfig,
  type Materiel,
} from "../materiel.types";

const today = () => new Date().toISOString().slice(0, 10);

function defaults(materiel?: Materiel): MaterielInput {
  return {
    nom: materiel?.nom ?? "",
    categorie: materiel?.categorie ?? "APPAREIL_PHOTO",
    marque: materiel?.marque ?? "",
    modele: materiel?.modele ?? "",
    numeroSerie: materiel?.numeroSerie ?? "",
    etat: materiel?.etat ?? "NEUF",
    dateAchat: materiel?.dateAchat.slice(0, 10) ?? today(),
    prix: materiel?.prix ?? 0,
    disponible: materiel?.disponible ?? true,
    photo: materiel?.photo ?? "",
  };
}

/**
 * Add / edit equipment (ADMIN). Opens from `trigger`, or is controlled with `open` +
 * `onOpenChange` (row menu).
 */
export function MaterielFormDialog({
  materiel,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  materiel?: Materiel;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const editing = !!materiel;
  const router = useRouter();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const [pending, startTransition] = useTransition();

  const form = useForm<MaterielInput>({
    resolver: zodResolver(materielSchema) as unknown as Resolver<MaterielInput>,
    defaultValues: defaults(materiel),
  });
  const { errors } = form.formState;
  const etat = useWatch({ control: form.control, name: "etat" });
  const enPanne = etat === "EN_PANNE";

  const setOpen = (next: boolean) => {
    if (pending) return;
    if (next) form.reset(defaults(materiel));
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, disponible: enPanne ? false : values.disponible };
    startTransition(async () => {
      const result = editing
        ? await updateMaterielAction(materiel.id, payload)
        : await createMaterielAction(payload);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? `${values.nom} saved` : `${values.nom} added to the inventory`);
      setInnerOpen(false);
      onOpenChange?.(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit equipment" : "Add equipment"}</DialogTitle>
          <DialogDescription>
            {editing ? materiel.nom : "Register a new item in the studio inventory."}
          </DialogDescription>
        </DialogHeader>
        <form id="materiel-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="nom" label="Name" required error={errors.nom?.message}>
            <IconInput
              id="nom"
              invalid={!!errors.nom}
              aria-describedby={describedBy("nom", errors.nom?.message)}
              placeholder="Canon EOS R5"
              {...form.register("nom")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="categorie" label="Category" required error={errors.categorie?.message}>
              <Controller
                control={form.control}
                name="categorie"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="categorie" className="h-10 w-full bg-card">
                      <SelectValue>{categorieMaterielLabels[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES_MATERIEL.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categorieMaterielLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="etat" label="Condition" required error={errors.etat?.message}>
              <Controller
                control={form.control}
                name="etat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="etat" className="h-10 w-full bg-card">
                      <SelectValue>{etatMaterielConfig[field.value].label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ETATS_MATERIEL.map((e) => (
                        <SelectItem key={e} value={e}>
                          {etatMaterielConfig[e].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="marque" label="Brand" required error={errors.marque?.message}>
              <IconInput id="marque" invalid={!!errors.marque} {...form.register("marque")} />
            </FormField>
            <FormField id="modele" label="Model" required error={errors.modele?.message}>
              <IconInput id="modele" invalid={!!errors.modele} {...form.register("modele")} />
            </FormField>
            <FormField
              id="numeroSerie"
              label="Serial number"
              required
              error={errors.numeroSerie?.message}
            >
              <IconInput
                id="numeroSerie"
                invalid={!!errors.numeroSerie}
                {...form.register("numeroSerie")}
              />
            </FormField>
            <FormField
              id="dateAchat"
              label="Purchase date"
              required
              error={errors.dateAchat?.message}
            >
              <IconInput
                id="dateAchat"
                type="date"
                max={today()}
                invalid={!!errors.dateAchat}
                {...form.register("dateAchat")}
              />
            </FormField>
            <FormField id="prix" label="Purchase price (TND)" required error={errors.prix?.message}>
              <IconInput
                id="prix"
                type="number"
                min={0}
                step="0.001"
                invalid={!!errors.prix}
                {...form.register("prix", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              id="disponible"
              label="Available for reservations"
              hint={enPanne ? "Out-of-order equipment is never available." : undefined}
            >
              <Controller
                control={form.control}
                name="disponible"
                render={({ field }) => (
                  <div className="flex h-10 items-center">
                    <Switch
                      id="disponible"
                      checked={enPanne ? false : field.value}
                      onCheckedChange={field.onChange}
                      disabled={enPanne}
                    />
                  </div>
                )}
              />
            </FormField>
          </div>
          <FormField
            id="photo"
            label="Photo URL"
            error={errors.photo?.message}
            hint="Optional. A link to a picture of the item."
          >
            <IconInput
              id="photo"
              type="url"
              placeholder="https://…"
              invalid={!!errors.photo}
              {...form.register("photo")}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="materiel-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
