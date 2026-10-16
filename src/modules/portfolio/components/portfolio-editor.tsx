"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AIBadge } from "@/components/shared/ai-badge";
import { AIPanel } from "@/components/shared/ai-panel";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, formatNumber } from "@/lib/utils";
import type { CandidatIA, ElementPortfolio, Portfolio } from "../portfolio.types";

const IA_CAPTIONS = [
  "A moment held still, caught in the golden light of late afternoon.",
  "Genuine emotion and a clean composition: the essence of the moment.",
  "Soft, natural colors that tell the story of the day.",
];

/** /dashboard/portfolio/[id] — ordered items (drag or arrows), featured, captions, consent, publish. */
export function PortfolioEditor({
  portfolio,
  candidats,
}: {
  portfolio: Portfolio;
  candidats: CandidatIA[];
}) {
  const [items, setItems] = useState(() =>
    [...portfolio.elements].sort((a, b) => a.ordreAffichage - b.ordreAffichage),
  );
  const [published, setPublished] = useState(portfolio.visibilite === "PUBLIC");
  const [dragId, setDragId] = useState<string | null>(null);
  const [captioning, setCaptioning] = useState<string | null>(null);

  const missingConsent = items.filter((i) => !i.consentementClient).length;
  const patch = (id: string, change: Partial<ElementPortfolio>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const move = (from: number, to: number) =>
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((i, index) => ({ ...i, ordreAffichage: index + 1 }));
    });

  const generateCaption = async (id: string, index: number) => {
    setCaptioning(id);
    await new Promise((r) => setTimeout(r, 600)); // simulates the AI call
    patch(id, { legende: IA_CAPTIONS[index % IA_CAPTIONS.length], legendeGenereeIA: true });
    setCaptioning(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-4">
        <Card className="flex-row flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Switch
              id="publish"
              checked={published}
              onCheckedChange={(checked) => {
                if (checked && missingConsent > 0) {
                  toast.error("Can't publish", {
                    description: `${missingConsent} photo(s) without client consent. Remove them or get the client's approval.`,
                  });
                  return;
                }
                setPublished(checked);
                comingSoon(checked ? "Publish the collection" : "Unpublish the collection");
              }}
              aria-describedby="publish-hint"
            />
            <label htmlFor="publish" className="text-sm">
              <span className="block font-semibold text-charcoal">
                {published ? "Collection published" : "Collection not published"}
              </span>
              <span id="publish-hint" className="text-xs text-muted-foreground">
                {published
                  ? "Visible on the public portfolio."
                  : "Visible to the studio staff only."}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden />
              {formatNumber(portfolio.nombreVues)} views
            </span>
            {missingConsent > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-warning-text">
                <ShieldAlert className="size-4" aria-hidden />
                {missingConsent} without consent
              </span>
            )}
          </div>
        </Card>

        <Card className="gap-0 py-0">
          <p className="border-b px-5 py-3 text-xs text-muted-foreground">
            Drag the photos to change the order (or use the arrows). The first 2 featured photos
            form the public cover.
          </p>
          <ol className="divide-y">
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = items.findIndex((i) => i.id === dragId);
                  if (from !== -1) move(from, index);
                  setDragId(null);
                }}
                className={cn(
                  "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center",
                  dragId === item.id && "bg-accent/50 opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="size-5 cursor-grab text-muted-foreground" aria-hidden />
                  <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <SafeImage
                      src={item.photo.url}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.consentementClient ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-text">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        Client consent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-text">
                        <ShieldAlert className="size-3.5" aria-hidden />
                        Consent missing
                      </span>
                    )}
                    {item.legendeGenereeIA && <AIBadge label="AI caption" />}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={item.legende}
                      onChange={(e) =>
                        patch(item.id, { legende: e.target.value, legendeGenereeIA: false })
                      }
                      aria-label={`Caption of photo ${index + 1}`}
                      className="h-9 bg-white"
                    />
                    <Button
                      type="button"
                      variant="ai-soft"
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={() => generateCaption(item.id, index)}
                      disabled={captioning === item.id}
                    >
                      {captioning === item.id ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Sparkles aria-hidden />
                      )}
                      <span className="hidden sm:inline">AI caption</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={item.estMisEnAvant ? "Remove from featured" : "Feature"}
                    aria-pressed={item.estMisEnAvant}
                    onClick={() => patch(item.id, { estMisEnAvant: !item.estMisEnAvant })}
                  >
                    <Star
                      className={cn(
                        item.estMisEnAvant ? "fill-warning text-warning" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    onClick={() => move(index, index + 1)}
                    disabled={index === items.length - 1}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex justify-end border-t px-4 py-3">
            <Button onClick={() => comingSoon("Save the order and captions")}>Save</Button>
          </div>
        </Card>
      </div>

      <aside className="self-start">
        <AIPanel
          title="AI selection of the best photos"
          description="Ranked by quality score among delivered galleries. Only photos with client consent can be added."
        >
          <ul className="grid grid-cols-2 gap-2">
            {candidats.map((candidat) => (
              <li
                key={candidat.photo.id}
                className="overflow-hidden rounded-lg bg-white ring-1 ring-ai/15"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <SafeImage
                    src={candidat.photo.url}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-white/95 px-1.5 text-[0.65rem] font-bold text-ai-text">
                    {candidat.photo.scoreQualite}
                  </span>
                </div>
                <div className="space-y-1.5 p-2">
                  <p className="truncate text-[0.7rem] text-muted-foreground">{candidat.galerie}</p>
                  <Button
                    size="xs"
                    variant={candidat.consentementClient ? "ai-soft" : "outline"}
                    className="w-full"
                    disabled={!candidat.consentementClient}
                    onClick={() => comingSoon("Add the photo to the portfolio")}
                  >
                    {candidat.consentementClient ? (
                      <>
                        <Plus aria-hidden />
                        Add
                      </>
                    ) : (
                      "No consent"
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </AIPanel>
      </aside>
    </div>
  );
}
