import { Camera, Sparkles } from "lucide-react";
import { AIConfidence, AIPanel } from "@/components/shared/ai-panel";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { formatDateTime } from "@/lib/utils";
import { categorieMaterielLabels, type KitSuggere } from "../materiel.types";

/** AI-suggested equipment kit for the next séance. */
export function KitSuggestion({ kit }: { kit: KitSuggere }) {
  return (
    <AIPanel
      title="Suggested kit"
      description={`For "${kit.seance.titre}" (${kit.seance.type}, ${formatDateTime(kit.seance.date)}), based on the session type and past sessions.`}
      footer={
        <div className="flex items-center justify-between gap-2">
          <AIConfidence value={kit.confiance} />
          <ComingSoonButton size="sm" variant="ai" feature="Reserve the suggested kit">
            <Sparkles aria-hidden />
            Reserve this kit
          </ComingSoonButton>
        </div>
      }
    >
      <ul className="space-y-2.5">
        {kit.items.map(({ materiel, raison }) => (
          <li key={materiel.id} className="flex gap-3 rounded-lg bg-card p-2.5 ring-1 ring-ai/10">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ai-soft text-ai-text">
              <Camera className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {materiel.nom}{" "}
                <span className="font-normal text-muted-foreground">
                  · {categorieMaterielLabels[materiel.categorie]}
                </span>
              </p>
              <p className="text-xs text-slate">{raison}</p>
            </div>
          </li>
        ))}
      </ul>
    </AIPanel>
  );
}
