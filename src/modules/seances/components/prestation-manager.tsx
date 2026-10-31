"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createPrestationAction,
  deletePrestationAction,
  setPrestationActifAction,
  updatePrestationAction,
} from "../catalogue.actions";
import { prestationSchema, type PrestationInput } from "../catalogue.schemas";
import type { PrestationDTO } from "../catalogue.types";

export function PrestationDialog({
  trigger,
  prestation,
}: {
  trigger: ReactNode;
  prestation?: PrestationDTO;
}) {
  const editing = !!prestation;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaults = (): PrestationInput => ({
    nom: prestation?.nom ?? "",
    description: prestation?.description ?? "",
    unite: prestation?.unite ?? "",
    actif: prestation?.actif ?? true,
  });
  const form = useForm<PrestationInput>({
    resolver: zodResolver(prestationSchema) as unknown as Resolver<PrestationInput>,
    defaultValues: defaults(),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = editing
        ? await updatePrestationAction(prestation.id, values)
        : await createPrestationAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Service updated" : "Service created");
      setOpen(false);
      router.refresh();
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
          <DialogTitle>{editing ? "Edit the service" : "New service"}</DialogTitle>
          <DialogDescription>
            Services are the building blocks of a pack (Full HD video, USB key, photo book…).
          </DialogDescription>
        </DialogHeader>
        <form id="prestation-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="nom" label="Name" required error={errors.nom?.message}>
            <IconInput
              id="nom"
              placeholder="Full HD video"
              invalid={!!errors.nom}
              aria-describedby={describedBy("nom", errors.nom?.message)}
              {...form.register("nom")}
            />
          </FormField>
          <FormField
            id="unite"
            label="Quantity unit"
            error={errors.unite?.message}
            hint="What the quantity counts in a pack: photos, prints, hours… (optional)"
          >
            <IconInput id="unite" placeholder="photos" {...form.register("unite")} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </FormField>
          <Controller
            control={form.control}
            name="actif"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                <span>
                  <span className="font-medium text-foreground">Active</span>
                  <span className="block text-xs text-muted-foreground">
                    Inactive services cannot be added to new packs.
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="prestation-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ prestation }: { prestation: PrestationDTO }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deletePrestationAction(prestation.id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Service deleted");
        router.refresh();
      }
      setConfirm(false);
    });

  return (
    <>
      <div className="flex justify-end gap-1">
        <PrestationDialog
          prestation={prestation}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${prestation.nom}`}>
              <Pencil aria-hidden />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${prestation.nom}`}
          onClick={() => setConfirm(true)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="destructive"
        title={`Delete "${prestation.nom}"?`}
        description="A service used by a pack cannot be deleted: deactivate it instead."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}

function ActifSwitch({ prestation }: { prestation: PrestationDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={prestation.actif}
      disabled={pending}
      aria-label={`${prestation.actif ? "Deactivate" : "Activate"} ${prestation.nom}`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          const result = await setPrestationActifAction(prestation.id, next);
          if (!result.ok) toast.error(result.error);
          else router.refresh();
        })
      }
    />
  );
}

export function PrestationManager({ prestations }: { prestations: PrestationDTO[] }) {
  return (
    <DataTable
      caption="Services"
      rows={prestations}
      getRowKey={(p) => p.id}
      empty={
        <EmptyState
          icon={ListChecks}
          title="No services yet"
          description="Add the services your studio really offers, then use them to build packs."
          action={
            <PrestationDialog
              trigger={
                <Button>
                  <Plus aria-hidden />
                  New service
                </Button>
              }
            />
          }
        />
      }
      columns={[
        {
          key: "nom",
          header: "Service",
          cell: (p) => (
            <div>
              <p className="font-medium text-foreground">{p.nom}</p>
              {p.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
              )}
            </div>
          ),
        },
        { key: "unite", header: "Unit", hideOnMobile: true, cell: (p) => p.unite ?? "—" },
        { key: "packs", header: "Used in", cell: (p) => `${p.nombrePacks} pack(s)` },
        { key: "actif", header: "Active", cell: (p) => <ActifSwitch prestation={p} /> },
        {
          key: "actions",
          header: <span className="sr-only">Actions</span>,
          className: "w-24 text-right",
          cell: (p) => <RowActions prestation={p} />,
        },
      ]}
    />
  );
}
