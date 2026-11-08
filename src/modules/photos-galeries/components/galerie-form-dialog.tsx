"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput, PasswordInput, describedBy } from "@/components/shared/form-field";
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
import { fullName } from "@/lib/mock-data-helpers";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { createGalerieAction, updateGalerieAction } from "../galerie.actions";
import { galerieCreateSchema, galerieUpdateSchema } from "../galerie.schemas";
import {
  CATEGORIES_GALERIE,
  STATUTS_GALERIE,
  categorieGalerieLabels,
  statutGalerieConfig,
  type CategorieGalerie,
  type Galerie,
  type StatutGalerie,
} from "../galerie.types";

type Values = {
  titre: string;
  categorie: CategorieGalerie;
  clientId: string;
  dateExpiration: string;
  telechargementAutorise: boolean;
  motDePasse: string;
  statut: StatutGalerie;
  preuveBlockchainRequise: boolean;
};

function inDaysDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Create a gallery, or edit its title / category / client / status.
 * `snapsealAvailable` (create only): offers the "blockchain proof required" option.
 * `lockedReason` (edit only): the gallery is sealed on-chain, so client and step can't change.
 */
export function GalerieFormDialog({
  trigger,
  clients,
  galerie,
  snapsealAvailable = false,
  lockedReason,
}: {
  trigger: React.ReactNode;
  clients: UtilisateurRef[];
  galerie?: Galerie;
  snapsealAvailable?: boolean;
  lockedReason?: string;
}) {
  const editing = !!galerie;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaults = (): Values => ({
    titre: galerie?.titre ?? "",
    categorie: galerie?.categorie ?? "MARIAGE",
    clientId: galerie?.client.id ?? "",
    dateExpiration: galerie?.dateExpiration.slice(0, 10) ?? inDaysDate(30),
    telechargementAutorise: galerie?.telechargementAutorise ?? false,
    motDePasse: "",
    statut: galerie?.statut ?? "EN_TRI",
    preuveBlockchainRequise: galerie?.preuveBlockchainRequise ?? false,
  });
  const form = useForm<Values>({
    // Create and edit share one field shape; each schema validates only its own fields.
    resolver: (editing
      ? zodResolver(galerieUpdateSchema)
      : zodResolver(galerieCreateSchema)) as unknown as Resolver<Values>,
    defaultValues: defaults(),
  });
  const { errors } = form.formState;
  const a11y = (name: keyof Values) => ({
    invalid: !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message),
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = editing
        ? await updateGalerieAction(galerie.id, values)
        : await createGalerieAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      setOpen(false);
      if (editing) {
        toast.success("Gallery updated");
        router.refresh();
      } else {
        toast.success("Gallery created: you can now import its photos");
        router.push(`/dashboard/galeries/${(result.data as { id: string }).id}`);
      }
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) form.reset(defaults());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit the gallery" : "New gallery"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Title, category, client and step of the gallery."
              : "The gallery starts in culling: the client sees it once you share it."}
          </DialogDescription>
        </DialogHeader>

        <form id="galerie-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="titre" label="Title" required error={errors.titre?.message}>
            <IconInput
              id="titre"
              placeholder="Leïla & Sami engagement"
              {...a11y("titre")}
              {...form.register("titre")}
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
                      <SelectValue>{categorieGalerieLabels[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES_GALERIE.map((value) => (
                        <SelectItem key={value} value={value}>
                          {categorieGalerieLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField id="clientId" label="Client" required error={errors.clientId?.message}>
              <Controller
                control={form.control}
                name="clientId"
                render={({ field }) => {
                  const selected = clients.find((c) => c.id === field.value);
                  return (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!lockedReason}
                    >
                      <SelectTrigger
                        id="clientId"
                        className="h-10 w-full bg-card"
                        aria-invalid={!!errors.clientId || undefined}
                        aria-describedby={describedBy("clientId", errors.clientId?.message)}
                      >
                        <SelectValue placeholder="Choose a client">
                          {selected
                            ? fullName(selected)
                            : galerie
                              ? fullName(galerie.client)
                              : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 && (
                          <p className="px-2 py-1.5 text-sm text-muted-foreground">
                            No active client yet.
                          </p>
                        )}
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {fullName(client)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </FormField>
          </div>

          {editing ? (
            <FormField
              id="statut"
              label="Step"
              required
              error={errors.statut?.message}
              hint={lockedReason}
            >
              <Controller
                control={form.control}
                name="statut"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!lockedReason}
                  >
                    <SelectTrigger id="statut" className="h-10 w-full bg-card">
                      <SelectValue>{statutGalerieConfig[field.value].label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_GALERIE.map((value) => (
                        <SelectItem key={value} value={value}>
                          {statutGalerieConfig[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="dateExpiration"
                  label="Expiry date"
                  required
                  error={errors.dateExpiration?.message}
                >
                  <IconInput
                    id="dateExpiration"
                    type="date"
                    {...a11y("dateExpiration")}
                    {...form.register("dateExpiration")}
                  />
                </FormField>
                <FormField
                  id="motDePasse"
                  label="Password"
                  error={errors.motDePasse?.message}
                  hint="Optional"
                >
                  <PasswordInput
                    id="motDePasse"
                    autoComplete="new-password"
                    {...a11y("motDePasse")}
                    {...form.register("motDePasse")}
                  />
                </FormField>
              </div>
              <Controller
                control={form.control}
                name="telechargementAutorise"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-3 text-sm text-slate">
                    Downloads allowed
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Downloads allowed"
                    />
                  </label>
                )}
              />
              {snapsealAvailable && (
                <Controller
                  control={form.control}
                  name="preuveBlockchainRequise"
                  render={({ field }) => (
                    <label className="flex items-start justify-between gap-3 text-sm text-slate">
                      <span className="space-y-0.5">
                        <span className="block">Blockchain proof required</span>
                        <span className="block text-xs text-muted-foreground">
                          The gallery is shared only once sealed, the client selects on-chain, and
                          originals and the delivery unlock step by step. Can&apos;t be changed later.
                        </span>
                      </span>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Blockchain proof required"
                      />
                    </label>
                  )}
                />
              )}
            </>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="galerie-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save" : "Create the gallery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
