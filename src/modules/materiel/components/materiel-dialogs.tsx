"use client";

import { AlertTriangle, PackageCheck } from "lucide-react";
import type { ReactNode } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { FormField } from "@/components/shared/form-field";
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
import { ETATS_MATERIEL, etatMaterielConfig } from "../materiel.types";

/** "Record return" (cahier: Reservation.enregistrerRetour(remarque)). */
export function ReturnDialog({
  materielNom,
  trigger,
}: {
  materielNom: string;
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="size-5 text-success" aria-hidden />
            Equipment return
          </DialogTitle>
          <DialogDescription>{materielNom}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            comingSoon("Record the return (reservation.service)");
          }}
        >
          <FormField id="etat-retour" label="Condition on return" required>
            <Select defaultValue="BON">
              <SelectTrigger id="etat-retour" className="h-10 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETATS_MATERIEL.map((etat) => (
                  <SelectItem key={etat} value={etat}>
                    {etatMaterielConfig[etat].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="remarque" label="Remarks">
            <Textarea
              id="remarque"
              rows={3}
              placeholder="Battery, missing accessories, scratches…"
              className="bg-white"
            />
          </FormField>
          <DialogFooter>
            <Button type="submit">Record return</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Report breakdown" (cahier: Materiel.signalerPanne()). */
export function BreakdownDialog({
  materielNom,
  trigger,
}: {
  materielNom: string;
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            Report a breakdown
          </DialogTitle>
          <DialogDescription>
            {materielNom} will be marked “Out of order” and removed from upcoming reservations.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            comingSoon("Report the breakdown (materiel.service)");
          }}
        >
          <FormField id="panne" label="Breakdown description" required>
            <Textarea
              id="panne"
              rows={4}
              placeholder="What is happening? Since when?"
              className="bg-white"
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" variant="destructive">
              Report breakdown
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
