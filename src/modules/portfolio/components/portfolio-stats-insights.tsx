"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { genererInsightsStatsAction } from "../portfolio.actions";

type Insights = { observations: string[]; actions: string[] };

export function PortfolioStatsInsights({ portfolioId }: { portfolioId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    try {
      const result = await genererInsightsStatsAction(portfolioId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInsights(result.data);
    } catch {
      toast.error("Impossible de générer les conseils statistiques.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Conseils IA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gemini examine les statistiques agrégées des 30 derniers jours, sans données visiteurs.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void generate()} disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {pending ? "Analyse…" : "Analyser les statistiques"}
        </Button>
      </div>
      {insights && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Observations</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {insights.observations.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">Actions suggérées</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {insights.actions.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
