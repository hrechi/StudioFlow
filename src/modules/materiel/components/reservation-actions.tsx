"use client";

import { AlertTriangle, Ban, Check, MoreHorizontal, PackageCheck, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionResult } from "@/lib/action-result";
import type { Role } from "@/lib/rbac";
import type { Reservation } from "../materiel.types";
import {
  annulerReservationAction,
  confirmerReservationAction,
  demarrerReservationAction,
} from "../reservation-materiel.actions";
import { peutPasser } from "../reservation-materiel.rules";
import { BreakdownDialog, ReturnDialog } from "./materiel-dialogs";

export type CurrentUser = { id: string; role: Role };

/**
 * Buttons allowed for this reservation and this user. ADMIN: every reservation;
 * PHOTOGRAPHE: confirm / cancel / return their own. Everyone can report a breakdown.
 * The server checks the same rules again.
 */
export function ReservationActions({
  reservation: r,
  currentUser,
}: {
  reservation: Reservation;
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [pending, startTransition] = useTransition();
  const isAdmin = currentUser.role === "ADMIN";
  const canManage = isAdmin || r.utilisateur?.id === currentUser.id;

  const run = (action: () => Promise<ActionResult>, message: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(message);
        router.refresh();
      }
      setCancelling(false);
    });

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Actions for ${r.materiel.nom}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
            {r.materiel.nom}
          </DropdownMenuLabel>
          {canManage && peutPasser(r.statut, "CONFIRMEE") && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() =>
                run(
                  () => confirmerReservationAction(r.id),
                  `${r.materiel.nom}: reservation confirmed`,
                )
              }
            >
              <Check aria-hidden />
              Confirm
            </DropdownMenuItem>
          )}
          {isAdmin && peutPasser(r.statut, "EN_COURS") && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() =>
                run(() => demarrerReservationAction(r.id), `${r.materiel.nom} handed over`)
              }
            >
              <Play aria-hidden />
              Start
            </DropdownMenuItem>
          )}
          {canManage && peutPasser(r.statut, "RETOURNEE") && (
            <ReturnDialog
              reservationId={r.id}
              materielNom={r.materiel.nom}
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <PackageCheck aria-hidden />
                  Return
                </DropdownMenuItem>
              }
            />
          )}
          {canManage && peutPasser(r.statut, "ANNULEE") && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => setCancelling(true)}
              className="text-destructive-text focus:bg-destructive/10 focus:text-destructive-text"
            >
              <Ban aria-hidden />
              Cancel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <BreakdownDialog
            materielId={r.materiel.id}
            materielNom={r.materiel.nom}
            trigger={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <AlertTriangle aria-hidden />
                Report breakdown
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={cancelling}
        onOpenChange={(open) => !open && setCancelling(false)}
        tone="destructive"
        title={`Cancel the reservation of ${r.materiel.nom}?`}
        description={`For “${r.seance.titre}”. The item becomes free again for this period.`}
        confirmLabel="Cancel reservation"
        cancelLabel="Keep it"
        pending={pending}
        onConfirm={() =>
          run(() => annulerReservationAction(r.id), `${r.materiel.nom}: reservation cancelled`)
        }
      />
    </div>
  );
}
