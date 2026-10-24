"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { createSeanceAction, updateSeanceAction } from "../seance.actions";
import {
  ROLES_EQUIPE,
  STATUTS_INITIAUX,
  roleEquipeLabels,
  statutSeanceReelConfig,
  type SeanceDTO,
} from "../seance.dto";
import { seanceSchema, type SeanceInput } from "../seance.schemas";

const NO_PACK = "__custom__";

const toLocal = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

type FormValues = Omit<SeanceInput, "dateDebut" | "dateFin"> & { dateDebut: string; dateFin: string };

export function SeanceForm({
  seance,
  clients,
  photographes,
  types,
  packs,
}: {
  seance?: SeanceDTO;
  clients: UtilisateurRef[];
  photographes: UtilisateurRef[];
  types: { id: string; nom: string }[];
  packs: { id: string; nom: string; typeId: string; disabled: boolean }[];
}) {
  const editing = !!seance;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [walkIn, setWalkIn] = useState(!!seance?.clientExterne);

  const form = useForm<FormValues>({
    resolver: zodResolver(seanceSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      titre: seance?.titre ?? "",
      clientId: seance?.client?.id ?? "",
      clientNom: seance?.clientExterne?.nom ?? "",
      clientTelephone: seance?.clientExterne?.telephone ?? "",
      clientEmail: seance?.clientExterne?.email ?? "",
      typeEvenementId: seance?.typeEvenement.id ?? "",
      packId: seance?.pack?.id ?? "",
      prestationPersonnalisee: seance?.prestationPersonnalisee ?? "",
      dateDebut: toLocal(seance?.dateDebut),
      dateFin: toLocal(seance?.dateFin),
      lieu: seance?.lieu ?? "",
      statut: "CONFIRMEE",
      equipe: seance?.equipe.map((m) => ({ employeId: m.employe.id, role: m.role })) ?? [],
      notes: seance?.notes ?? "",
    },
  });
  const { errors } = form.formState;
  const team = useFieldArray({ control: form.control, name: "equipe" });
  const typeId = form.watch("typeEvenementId");
  const packId = form.watch("packId");
  const typePacks = packs.filter((p) => p.typeId === typeId);
  const err = (n: keyof FormValues) => errors[n]?.message as string | undefined;

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, dateDebut: toIso(values.dateDebut), dateFin: toIso(values.dateFin) };
    startTransition(async () => {
      const result = editing
        ? await updateSeanceAction(seance.id, payload)
        : await createSeanceAction(payload);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Session saved" : "Session created");
      if (editing) router.refresh();
      else router.push("/dashboard/seances");
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">Session</h2>
        <FormField id="titre" label="Title" required error={err("titre")}>
          <IconInput id="titre" placeholder="Wedding — Sarra & Omar" invalid={!!errors.titre}
            aria-describedby={describedBy("titre", err("titre"))} {...form.register("titre")} />
        </FormField>
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Client</p>
            <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Client type">
              <Button type="button" size="sm" variant={walkIn ? "ghost" : "default"} aria-pressed={!walkIn}
                onClick={() => { setWalkIn(false); form.setValue("clientNom", ""); form.setValue("clientTelephone", ""); form.setValue("clientEmail", ""); }}>
                Has an account
              </Button>
              <Button type="button" size="sm" variant={walkIn ? "default" : "ghost"} aria-pressed={walkIn}
                onClick={() => { setWalkIn(true); form.setValue("clientId", ""); }}>
                No account (phone / walk-in)
              </Button>
            </div>
          </div>
          {walkIn ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="clientNom" label="Full name" required error={err("clientNom")}>
                <IconInput id="clientNom" {...form.register("clientNom")} />
              </FormField>
              <FormField id="clientTelephone" label="Phone" required error={err("clientTelephone")}>
                <IconInput id="clientTelephone" type="tel" {...form.register("clientTelephone")} />
              </FormField>
              <FormField id="clientEmail" label="Email" error={err("clientEmail")}>
                <IconInput id="clientEmail" type="email" {...form.register("clientEmail")} />
              </FormField>
            </div>
          ) : (
            <FormField id="clientId" label="Client account" required error={err("clientId") ?? err("clientNom")}>
              <Controller control={form.control} name="clientId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="clientId" className="h-10 w-full bg-card">
                    <SelectValue placeholder="Choose a client">
                      {(() => { const c = clients.find((x) => x.id === field.value); return c ? fullName(c) : undefined; })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="typeEvenementId" label="Event type" required error={err("typeEvenementId")}>
            <Controller control={form.control} name="typeEvenementId" render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("packId", ""); }}>
                <SelectTrigger id="typeEvenementId" className="h-10 w-full bg-card">
                  <SelectValue placeholder="Choose a type">{types.find((t) => t.id === field.value)?.nom}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
        </div>
        <FormField id="packId" label="Pack" error={err("packId")} hint="Packs of the chosen event type, or a custom service.">
          <Select
            value={packId || NO_PACK}
            onValueChange={(v) => form.setValue("packId", v === NO_PACK ? "" : v, { shouldValidate: true })}
            disabled={!typeId}
          >
            <SelectTrigger id="packId" className="h-10 w-full bg-card">
              <SelectValue>{packId ? typePacks.find((p) => p.id === packId)?.nom : "Custom service"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PACK}>Custom service</SelectItem>
              {typePacks.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.disabled && p.id !== seance?.pack?.id}>
                  {p.nom}{p.disabled ? " (disabled)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {!packId && (
          <FormField id="prestationPersonnalisee" label="Custom service" required error={err("prestationPersonnalisee")}>
            <Textarea id="prestationPersonnalisee" rows={3} {...form.register("prestationPersonnalisee")} />
          </FormField>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-foreground">Schedule & location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="dateDebut" label="Start" required error={err("dateDebut")}>
            <IconInput id="dateDebut" type="datetime-local" {...form.register("dateDebut")} />
          </FormField>
          <FormField id="dateFin" label="End" required error={err("dateFin")}>
            <IconInput id="dateFin" type="datetime-local" {...form.register("dateFin")} />
          </FormField>
        </div>
        <FormField id="lieu" label="Location" required error={err("lieu")}>
          <IconInput id="lieu" placeholder="Studio, venue address…" {...form.register("lieu")} />
        </FormField>
        {!editing && (
          <FormField id="statut" label="Initial status" error={err("statut")}>
            <Controller control={form.control} name="statut" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="statut" className="h-10 w-full bg-card sm:w-72">
                  <SelectValue>{field.value ? statutSeanceReelConfig[field.value as keyof typeof statutSeanceReelConfig].label : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_INITIAUX.map((s) => <SelectItem key={s} value={s}>{statutSeanceReelConfig[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Team</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => team.append({ employeId: "", role: "PHOTOGRAPHE_PRINCIPAL" })}>
            <Plus aria-hidden />
            Assign someone
          </Button>
        </div>
        {(err("equipe") || (errors.equipe as { root?: { message?: string } } | undefined)?.root?.message) && (
          <p role="alert" className="text-xs font-medium text-destructive-text">
            {err("equipe") ?? (errors.equipe as { root: { message: string } }).root.message}
          </p>
        )}
        {team.fields.length === 0 && <p className="text-sm text-muted-foreground">No one assigned yet. Conflicts are checked on save.</p>}
        {team.fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-3 sm:grid-cols-[2fr_2fr_auto]">
            <FormField id={`equipe.${index}.employeId`} label="Employee" error={errors.equipe?.[index]?.employeId?.message}>
              <Controller control={form.control} name={`equipe.${index}.employeId`} render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className="h-10 w-full bg-card">
                    <SelectValue placeholder="Choose…">{(() => { const p = photographes.find((x) => x.id === f.value); return p ? fullName(p) : undefined; })()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {photographes.map((p) => <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField id={`equipe.${index}.role`} label="Role" error={errors.equipe?.[index]?.role?.message}>
              <Controller control={form.control} name={`equipe.${index}.role`} render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className="h-10 w-full bg-card"><SelectValue>{roleEquipeLabels[f.value]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {ROLES_EQUIPE.map((r) => <SelectItem key={r} value={r}>{roleEquipeLabels[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label="Remove this person" onClick={() => team.remove(index)}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-4 p-5">
        <FormField id="notes" label="Internal notes" error={err("notes")}>
          <Textarea id="notes" rows={3} {...form.register("notes")} />
        </FormField>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {editing ? "Save changes" : "Create session"}
        </Button>
      </div>
    </form>
  );
}
