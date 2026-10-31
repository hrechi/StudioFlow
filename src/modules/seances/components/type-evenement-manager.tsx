"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MoreHorizontal, Pencil, Plus, Sparkles, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { ToneBadge } from "@/components/shared/status-badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createTypeEvenementAction,
  deleteTypeEvenementAction,
  seedDefaultTypesAction,
  setTypeEvenementActifAction,
  updateTypeEvenementAction,
} from "../catalogue.actions";
import { typeEvenementSchema, type TypeEvenementInput } from "../catalogue.schemas";
import { PACKS_MAX_DEFAUT, PACKS_MAX_PLAFOND, type TypeEvenementDTO } from "../catalogue.types";

export function TypeEvenementDialog({
  trigger,
  type,
}: {
  trigger: ReactNode;
  type?: TypeEvenementDTO;
}) {
  const editing = !!type;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaults = (): TypeEvenementInput => ({
    nom: type?.nom ?? "",
    description: type?.description ?? "",
    maxPacks: type?.maxPacks ?? PACKS_MAX_DEFAUT,
    actif: type?.actif ?? true,
  });
  const form = useForm<TypeEvenementInput>({
    resolver: zodResolver(typeEvenementSchema) as unknown as Resolver<TypeEvenementInput>,
    defaultValues: defaults(),
  });
  const { errors } = form.formState;
  const a11y = (name: keyof TypeEvenementInput) => ({
    invalid: !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message),
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = editing
        ? await updateTypeEvenementAction(type.id, values)
        : await createTypeEvenementAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Event type updated" : "Event type created");
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
          <DialogTitle>{editing ? "Edit the event type" : "New event type"}</DialogTitle>
          <DialogDescription>
            Each event type has its own packs, up to the limit you set here.
          </DialogDescription>
        </DialogHeader>
        <form id="type-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="nom" label="Name" required error={errors.nom?.message}>
            <IconInput id="nom" placeholder="Wedding" {...a11y("nom")} {...form.register("nom")} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea
              id="description"
              rows={3}
              aria-invalid={!!errors.description || undefined}
              {...form.register("description")}
            />
          </FormField>
          <FormField
            id="maxPacks"
            label="Maximum number of packs"
            required
            error={errors.maxPacks?.message}
            hint={`Enforced by the server. Between 1 and ${PACKS_MAX_PLAFOND}.`}
          >
            <IconInput
              id="maxPacks"
              type="number"
              min={1}
              max={PACKS_MAX_PLAFOND}
              {...a11y("maxPacks")}
              {...form.register("maxPacks", { valueAsNumber: true })}
            />
          </FormField>
          <Controller
            control={form.control}
            name="actif"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                <span>
                  <span className="font-medium text-foreground">Active</span>
                  <span className="block text-xs text-muted-foreground">
                    Inactive types and their packs disappear from the showcase site.
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
          <Button type="submit" form="type-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActifSwitch({ type }: { type: TypeEvenementDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={type.actif}
      disabled={pending}
      aria-label={`${type.actif ? "Disable" : "Enable"} ${type.nom}`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          const result = await setTypeEvenementActifAction(type.id, next);
          if (!result.ok) toast.error(result.error);
          else router.refresh();
        })
      }
    />
  );
}

function RowMenu({ type }: { type: TypeEvenementDTO }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteTypeEvenementAction(type.id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Event type deleted");
        router.refresh();
      }
      setConfirm(false);
    });

  return (
    <>
      <div className="flex justify-end gap-1">
        <TypeEvenementDialog
          type={type}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${type.nom}`}>
              <Pencil aria-hidden />
            </Button>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${type.nom}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="destructive"
        title={`Delete "${type.nom}"?`}
        description="Only possible when the type has no packs. To hide it from the site, disable it instead."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}

export function TypeEvenementManager({ types }: { types: TypeEvenementDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const seed = () =>
    startTransition(async () => {
      const result = await seedDefaultTypesAction();
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(`${result.data.added} event type(s) added`);
        router.refresh();
      }
    });

  return (
    <DataTable
      caption="Event types"
      rows={types}
      getRowKey={(t) => t.id}
      empty={
        <EmptyState
          icon={Tags}
          title="No event types yet"
          description="Create your own, or load the usual ones (wedding, henna, birthday…) and adjust them."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={seed} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
                Load default types
              </Button>
              <TypeEvenementDialog
                trigger={
                  <Button variant="outline">
                    <Plus aria-hidden />
                    New event type
                  </Button>
                }
              />
            </div>
          }
        />
      }
      columns={[
        {
          key: "nom",
          header: "Event type",
          cell: (t) => (
            <div>
              <p className="font-medium text-foreground">{t.nom}</p>
              {t.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
          ),
        },
        {
          key: "packs",
          header: "Packs",
          cell: (t) => (
            <ToneBadge
              tone={t.nombrePacks >= t.maxPacks ? "warning" : "neutral"}
              label={`${t.nombrePacks} / ${t.maxPacks}`}
            />
          ),
        },
        { key: "actif", header: "Active", cell: (t) => <ActifSwitch type={t} /> },
        {
          key: "actions",
          header: <span className="sr-only">Actions</span>,
          className: "w-24 text-right",
          cell: (t) => <RowMenu type={t} />,
        },
      ]}
    />
  );
}
