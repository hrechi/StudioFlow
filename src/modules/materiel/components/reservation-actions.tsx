"use client";

import { AlertTriangle, Ban, Check, PackageCheck, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
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
    <div className="flex justify-end gap-1">
      {canManage && peutPasser(r.statut, "CONFIRMEE") && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => confirmerReservationAction(r.id), `${r.materiel.nom}: reservation confirmed`)
          }
        >
          <Check aria-hidden />
          Confirm
        </Button>
      )}
      {isAdmin && peutPasser(r.statut, "EN_COURS") && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => demarrerReservationAction(r.id), `${r.materiel.nom} handed over`)
          }
        >
          <Play aria-hidden />
          Start
        </Button>
      )}
      {canManage && peutPasser(r.statut, "RETOURNEE") && (
        <ReturnDialog
          reservationId={r.id}
          materielNom={r.materiel.nom}
          trigger={
            <Button size="sm" variant="outline">
              <PackageCheck aria-hidden />
              Return
            </Button>
          }
        />
      )}
      {canManage && peutPasser(r.statut, "ANNULEE") && (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={pending}
          aria-label={`Cancel the reservation: ${r.materiel.nom}`}
          onClick={() => setCancelling(true)}
        >
          <Ban aria-hidden />
        </Button>
      )}
      <BreakdownDialog
        materielId={r.materiel.id}
        materielNom={r.materiel.nom}
        trigger={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Report a breakdown: ${r.materiel.nom}`}
          >
            <AlertTriangle aria-hidden />
          </Button>
        }
      />
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
