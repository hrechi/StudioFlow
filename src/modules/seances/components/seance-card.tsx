import { CalendarDays, Clock, MapPin } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { statutSeanceConfig, typeSeanceLabels, type Seance } from "../seance.types";

/** Photo-first séance card for the client area. */
export function SeanceCard({ seance, className }: { seance: Seance; className?: string }) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-border",
        className,
      )}
    >
      <div className="relative h-36">
        <SafeImage
          src={seance.couverture}
          alt=""
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
        <div className="absolute top-3 left-3">
          <StatusBadge value={seance.statut} config={statutSeanceConfig} className="bg-white" />
        </div>
        <p className="absolute bottom-3 left-4 text-xs font-semibold tracking-wide text-white/90 uppercase">
          {typeSeanceLabels[seance.type]}
        </p>
      </div>
      <div className="space-y-3 p-4">
        <h3 className="font-semibold text-charcoal">{seance.titre}</h3>
        <ul className="space-y-1.5 text-sm text-slate">
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            {formatDate(seance.dateDebut)}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            {formatTime(seance.dateDebut)} – {formatTime(seance.dateFin)}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            <span className="truncate">{seance.lieu.nom}</span>
          </li>
        </ul>
        <p className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <UserAvatar {...seance.photographe} size="sm" />
          With {fullName(seance.photographe)}
        </p>
      </div>
    </article>
  );
}
