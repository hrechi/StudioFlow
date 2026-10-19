"use client";

import { Check, CheckCircle2, Copy, EyeOff, ScanEye, ScanSearch, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { AIBadge } from "@/components/shared/ai-badge";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { statutCullingConfig, type Photo, type StatutCulling } from "../galerie.types";
import { setCullingAction } from "../photo.actions";
import { scoreTone } from "./photo-thumb";

function Check2({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: typeof EyeOff }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={cn("size-4", ok ? "text-success" : "text-destructive")} aria-hidden />
      <span className="flex-1 text-slate">{label}</span>
      {ok ? (
        <CheckCircle2 className="size-4 text-success" aria-label="OK" />
      ) : (
        <XCircle className="size-4 text-destructive" aria-label="Issue detected" />
      )}
    </li>
  );
}

/** Details of the selected photo: metadata, AI analysis, culling actions. */
export function PhotoDetailPanel({ photo, onClose }: { photo: Photo; onClose?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setStatus = (statut: StatutCulling) =>
    startTransition(async () => {
      const result = await setCullingAction({ ids: [photo.id], statut });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${photo.nomFichier}: ${statutCullingConfig[statut].label.toLowerCase()}`);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-charcoal">{photo.nomFichier}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(photo.datePrise ?? photo.dateUpload)}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
            <X aria-hidden />
          </Button>
        )}
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <SafeImage
          src={photo.url}
          alt={photo.tagsIA.join(", ")}
          fill
          sizes="320px"
          className="object-cover"
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Format</dt>
          <dd className="font-medium text-slate">{photo.format}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="font-medium text-slate">{(photo.taille / 1_000_000).toFixed(1)} MB</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Culling</dt>
          <dd>
            <StatusBadge value={photo.statutCulling} config={statutCullingConfig} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Quality score</dt>
          <dd className={cn("text-lg font-bold", scoreTone(photo.scoreQualite))}>
            {photo.scoreQualite}/100
          </dd>
        </div>
      </dl>

      <section className="space-y-3 rounded-lg bg-ai-soft/70 p-3 ring-1 ring-ai/15">
        <div className="flex items-center gap-2">
          <AIBadge />
          <p className="text-sm font-semibold text-charcoal">AI analysis</p>
        </div>
        <ul className="space-y-1.5">
          <Check2 ok={!photo.estFloue} label="Sharpness" icon={EyeOff} />
          <Check2 ok={!photo.yeuxFermes} label="Eyes open" icon={ScanEye} />
          <Check2 ok={!photo.groupeDoublon} label="No duplicate" icon={Copy} />
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {photo.tagsIA.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ai-text ring-1 ring-ai/20"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={pending || photo.statutCulling === "RETENUE"}
          onClick={() => setStatus("RETENUE")}
        >
          <Check aria-hidden />
          Keep
        </Button>
        <Button
          variant="destructive-soft"
          disabled={pending || photo.statutCulling === "REJETEE"}
          onClick={() => setStatus("REJETEE")}
        >
          <X aria-hidden />
          Reject
        </Button>
        <Button
          variant="ai-soft"
          className="col-span-2"
          onClick={() => comingSoon("Find similar photos")}
        >
          <ScanSearch aria-hidden />
          Similar photos
        </Button>
      </div>
    </div>
  );
}
