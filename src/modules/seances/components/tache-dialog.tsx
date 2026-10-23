"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { createTacheAction, updateTacheAction } from "../tache.actions";
import {
  PHASES, PRIORITES, STATUTS_TACHE, phaseLabels, prioriteConfig, statutTacheConfig, type TacheDTO,
} from "../tache.dto";
import { tacheSchema, type TacheInput } from "../tache.schemas";

const NONE = "__none__";
const toLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function TacheDialog({
  trigger, tache, seances, photographes,
}: {
  trigger: ReactNode;
  tache?: TacheDTO;
  seances: { id: string; titre: string }[];
  photographes: UtilisateurRef[];
}) {
  const editing = !!tache;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaults = () => ({
    seanceId: tache?.seance.id ?? "",
    titre: tache?.titre ?? "",
    description: tache?.description ?? "",
    employeId: tache?.employe?.id ?? "",
    dateLimite: toLocal(tache?.dateLimite),
    priorite: tache?.priorite ?? "NORMALE",
    phase: tache?.phase ?? "AVANT",
    statut: tache?.statut ?? "A_FAIRE",
  } satisfies TacheInput);

  const form = useForm<TacheInput>({
    resolver: zodResolver(tacheSchema) as unknown as Resolver<TacheInput>,
    defaultValues: defaults(),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, dateLimite: values.dateLimite ? new Date(values.dateLimite).toISOString() : "" };
    startTransition(async () => {
      const result = editing ? await updateTacheAction(tache.id, payload) : await createTacheAction(payload);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Task updated" : "Task created");
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (pending) return; setOpen(next); if (next) form.reset(defaults()); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit the task" : "New task"}</DialogTitle>
          <DialogDescription>Assign it to a team member and set a deadline.</DialogDescription>
        </DialogHeader>
        <form id="tache-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="seanceId" label="Session" required error={errors.seanceId?.message}>
            <Controller control={form.control} name="seanceId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="seanceId" className="h-10 w-full bg-card">
                  <SelectValue placeholder="Choose a session">{seances.find((s) => s.id === field.value)?.titre}</SelectValue>
                </SelectTrigger>
                <SelectContent>{seances.map((s) => <SelectItem key={s.id} value={s.id}>{s.titre}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="titre" label="Title" required error={errors.titre?.message}>
            <IconInput id="titre" {...form.register("titre")} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="employeId" label="Assigned to" error={errors.employeId?.message}>
              <Controller control={form.control} name="employeId" render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <SelectTrigger id="employeId" className="h-10 w-full bg-card">
                    <SelectValue>{(() => { const p = photographes.find((x) => x.id === field.value); return p ? fullName(p) : "Unassigned"; })()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {photographes.map((p) => <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField id="dateLimite" label="Deadline" error={errors.dateLimite?.message}>
              <IconInput id="dateLimite" type="datetime-local" {...form.register("dateLimite")} />
            </FormField>
            <FormField id="phase" label="Phase" error={errors.phase?.message}>
              <Controller control={form.control} name="phase" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="phase" className="h-10 w-full bg-card"><SelectValue>{phaseLabels[field.value]}</SelectValue></SelectTrigger>
                  <SelectContent>{PHASES.map((p) => <SelectItem key={p} value={p}>{phaseLabels[p]}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField id="priorite" label="Priority" error={errors.priorite?.message}>
              <Controller control={form.control} name="priorite" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priorite" className="h-10 w-full bg-card"><SelectValue>{prioriteConfig[field.value].label}</SelectValue></SelectTrigger>
                  <SelectContent>{PRIORITES.map((p) => <SelectItem key={p} value={p}>{prioriteConfig[p].label}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
          </div>
          <FormField id="statut" label="Status" error={errors.statut?.message}>
            <Controller control={form.control} name="statut" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="statut" className="h-10 w-full bg-card sm:w-60"><SelectValue>{statutTacheConfig[field.value].label}</SelectValue></SelectTrigger>
                <SelectContent>{STATUTS_TACHE.map((s) => <SelectItem key={s} value={s}>{statutTacheConfig[s].label}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button type="submit" form="tache-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
