"use client";

import { CalendarDays, MapPin, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { SafeImage } from "@/components/shared/safe-image";
import { PLACEHOLDER_IMAGE } from "@/lib/mock-images";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { cancelReservationAction } from "../reservation.actions";
import {
  STATUTS_ANNULABLES_CLIENT,
  statutSeanceReelConfig,
  type SeanceClientDTO,
} from "../seance.dto";

/** Card shown on the client's "My sessions" page. */
export function ClientSeanceCard({ seance, className }: { seance: SeanceClientDTO; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canCancel = STATUTS_ANNULABLES_CLIENT.includes(seance.statut);

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelReservationAction(seance.id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Request cancelled.");
        router.refresh();
      }
    });

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="relative h-36 bg-muted">
        <SafeImage src={PLACEHOLDER_IMAGE} alt="" fill sizes="33vw" className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{seance.titre}</p>
          <StatusBadge value={seance.statut} config={statutSeanceReelConfig} />
        </div>
        <p className="text-xs text-muted-foreground">{seance.typeEvenement.nom}</p>
        {seance.pack && <p className="text-xs text-muted-foreground">{seance.pack.nom}</p>}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDate(seance.dateDebut)} · {formatTime(seance.dateDebut)}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {seance.lieu}
        </p>
        {seance.messageClient && (
          <p className="line-clamp-2 text-xs text-muted-foreground italic">"{seance.messageClient}"</p>
        )}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={cancel}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Cancel this request
          </Button>
        )}
      </div>
    </Card>
  );
}
