"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, describedBy } from "@/components/shared/form-field";
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
import { Textarea } from "@/components/ui/textarea";
import { etatMaterielConfig } from "../materiel.types";
import { enregistrerRetourAction, signalerPanneAction } from "../reservation-materiel.actions";
import {
  ETATS_RETOUR,
  panneSchema,
  retourSchema,
  type PanneInput,
  type RetourInput,
} from "../reservation-materiel.schemas";

const RETOUR_DEFAULTS: RetourInput = { etat: "BON", remarque: "" };
const PANNE_DEFAULTS: PanneInput = { description: "" };

/** "Record return" (cahier: Reservation.enregistrerRetour(remarque)). */
export function ReturnDialog({
  reservationId,
  materielNom,
  trigger,
}: {
  reservationId: string;
  materielNom: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<RetourInput>({
    resolver: zodResolver(retourSchema) as unknown as Resolver<RetourInput>,
    defaultValues: RETOUR_DEFAULTS,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await enregistrerRetourAction(reservationId, values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`${materielNom} returned`);
      setOpen(false);
      router.refresh();
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) form.reset(RETOUR_DEFAULTS);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="size-5 text-success" aria-hidden />
            Equipment return
          </DialogTitle>
          <DialogDescription>{materielNom}</DialogDescription>
        </DialogHeader>
        <form id={`retour-${reservationId}`} className="space-y-4" onSubmit={onSubmit} noValidate>
          <FormField
            id={`etat-retour-${reservationId}`}
            label="Condition on return"
            required
            error={errors.etat?.message}
          >
            <Controller
              control={form.control}
              name="etat"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id={`etat-retour-${reservationId}`}
                    className="h-10 w-full bg-card"
                  >
                    <SelectValue>{etatMaterielConfig[field.value].label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ETATS_RETOUR.map((etat) => (
                      <SelectItem key={etat} value={etat}>
                        {etatMaterielConfig[etat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            id={`remarque-${reservationId}`}
            label="Remarks"
            error={errors.remarque?.message}
          >
            <Textarea
              id={`remarque-${reservationId}`}
              rows={3}
              placeholder="Battery, missing accessories, scratches…"
              className="bg-card"
              aria-describedby={describedBy(`remarque-${reservationId}`, errors.remarque?.message)}
              {...form.register("remarque")}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={`retour-${reservationId}`} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Record return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Report breakdown" (cahier: Materiel.signalerPanne()). */
export function BreakdownDialog({
  materielId,
  materielNom,
  trigger,
}: {
  materielId: string;
  materielNom: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<PanneInput>({
    resolver: zodResolver(panneSchema) as unknown as Resolver<PanneInput>,
    defaultValues: PANNE_DEFAULTS,
  });
  const { errors } = form.formState;
  const fieldId = `panne-${materielId}`;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await signalerPanneAction(materielId, values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      const { notifies } = result.data;
      toast.success(
        notifies > 0
          ? `${materielNom} marked out of order · ${notifies} user${notifies > 1 ? "s" : ""} notified`
          : `${materielNom} marked out of order`,
      );
      setOpen(false);
      router.refresh();
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) form.reset(PANNE_DEFAULTS);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            Report a breakdown
          </DialogTitle>
          <DialogDescription>
            {materielNom} will be marked “Out of order” and unavailable. Everyone with an upcoming
            reservation of it is notified.
          </DialogDescription>
        </DialogHeader>
        <form id={`form-${fieldId}`} className="space-y-4" onSubmit={onSubmit} noValidate>
          <FormField
            id={fieldId}
            label="Breakdown description"
            required
            error={errors.description?.message}
          >
            <Textarea
              id={fieldId}
              rows={4}
              placeholder="What is happening? Since when?"
              className="bg-card"
              aria-invalid={!!errors.description || undefined}
              aria-describedby={describedBy(fieldId, errors.description?.message)}
              {...form.register("description")}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={`form-${fieldId}`} variant="destructive" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Report breakdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
