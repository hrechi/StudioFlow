import { CalendarDays, MapPin } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { statutSeanceConfig, typeSeanceLabels, type Seance } from "../seance.types";

/** TEMPORARY card used by the client "My sessions" template page. */
export function SeanceCard({ seance, className }: { seance: Seance; className?: string }) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="relative h-36">
        <SafeImage src={seance.couverture} alt="" fill sizes="33vw" className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{seance.titre}</p>
          <StatusBadge value={seance.statut} config={statutSeanceConfig} />
        </div>
        <p className="text-xs text-muted-foreground">{typeSeanceLabels[seance.type]}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDate(seance.dateDebut)} · {formatTime(seance.dateDebut)}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {seance.lieu.nom}
        </p>
      </div>
    </Card>
  );
}
