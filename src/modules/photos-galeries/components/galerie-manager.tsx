"use client";

import {
  Check,
  Copy,
  Heart,
  Link2,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AIPanel } from "@/components/shared/ai-panel";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { FormField } from "@/components/shared/form-field";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  statutCullingConfig,
  type Galerie,
  type Photo,
  type StatutCulling,
} from "../galerie.types";
import { AILabels } from "./photo-thumb";

const TABS: { value: StatutCulling | "TOUTES"; label: string }[] = [
  { value: "TOUTES", label: "All" },
  { value: "RETENUE", label: "Kept" },
  { value: "EN_ATTENTE", label: "Pending" },
  { value: "REJETEE", label: "Rejected" },
];

/** /dashboard/galeries/[id] — culling view + share settings + client selection summary. */
export function GalerieManager({ galerie, photos }: { galerie: Galerie; photos: Photo[] }) {
  const [culling, setCulling] = useState(() => new Map(photos.map((p) => [p.id, p.statutCulling])));
  const [download, setDownload] = useState(galerie.telechargementAutorise);

  const setStatus = (id: string, statut: StatutCulling) =>
    setCulling((prev) => new Map(prev).set(id, statut));
  const count = (s: StatutCulling) => [...culling.values()].filter((v) => v === s).length;
  const favoris = photos.filter((p) => p.estFavori);
  const commentaires = photos.filter((p) => p.commentaireClient);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Card className="min-w-0 gap-0 py-0">
        <Tabs defaultValue="TOUTES" className="gap-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pt-2">
            <TabsList variant="line">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <span className="rounded-full bg-muted px-1.5 text-[0.7rem] font-semibold text-slate">
                    {tab.value === "TOUTES" ? photos.length : count(tab.value)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              size="sm"
              variant="ai-soft"
              className="mb-2"
              onClick={() => comingSoon("AI auto-culling")}
            >
              <Sparkles aria-hidden />
              Auto-cull
            </Button>
          </div>
          {TABS.map((tab) => {
            const list = photos.filter(
              (p) => tab.value === "TOUTES" || culling.get(p.id) === tab.value,
            );
            return (
              <TabsContent key={tab.value} value={tab.value} className="p-4">
                {list.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No photos in this category.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                    {list.map((photo) => {
                      const status = culling.get(photo.id) ?? photo.statutCulling;
                      return (
                        <li
                          key={photo.id}
                          className={cn(
                            "group overflow-hidden rounded-xl bg-white ring-1 ring-border",
                            status === "REJETEE" && "opacity-70",
                          )}
                        >
                          <div className="relative aspect-[4/3] bg-muted">
                            <SafeImage
                              src={photo.urlMiniature}
                              alt={photo.tagsIA.join(", ")}
                              fill
                              sizes="(min-width: 1280px) 18vw, 45vw"
                              className="object-cover"
                            />
                            <AILabels photo={photo} className="absolute bottom-2 left-2" />
                            {photo.estFavori && (
                              <Heart
                                className="absolute top-2 right-2 size-5 fill-destructive text-destructive drop-shadow"
                                aria-label="Client favorite"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1 p-2">
                            <StatusBadge
                              value={status}
                              config={statutCullingConfig}
                              className="h-5 px-2 text-[0.65rem]"
                            />
                            <div className="flex gap-0.5">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label="Keep"
                                onClick={() => setStatus(photo.id, "RETENUE")}
                                className={cn(
                                  status === "RETENUE" && "bg-success/15 text-success-text",
                                )}
                              >
                                <Check aria-hidden />
                              </Button>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label="Reject"
                                onClick={() => setStatus(photo.id, "REJETEE")}
                                className={cn(
                                  status === "REJETEE" && "bg-destructive/15 text-destructive-text",
                                )}
                              >
                                <X aria-hidden />
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" aria-hidden />
              Share with the client
            </CardTitle>
            <CardDescription>Private link, password and expiry date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField id="lien" label="Access link">
              <div className="flex gap-2">
                <Input
                  id="lien"
                  readOnly
                  value={galerie.lienAcces}
                  className="h-9 bg-surface text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy link"
                  onClick={() => {
                    void navigator.clipboard?.writeText(galerie.lienAcces);
                    toast.success("Link copied");
                  }}
                >
                  <Copy aria-hidden />
                </Button>
              </div>
            </FormField>
            <FormField id="motDePasseGalerie" label="Password">
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="motDePasseGalerie"
                  defaultValue={galerie.motDePasse ?? ""}
                  placeholder="None"
                  className="h-9 bg-white pl-9"
                />
              </div>
            </FormField>
            <FormField id="expiration" label="Expiry date">
              <Input
                id="expiration"
                type="date"
                defaultValue={galerie.dateExpiration.slice(0, 10)}
                className="h-9 bg-white"
              />
            </FormField>
            <label className="flex items-center justify-between gap-3 text-sm text-slate">
              Downloads allowed
              <Switch
                checked={download}
                onCheckedChange={setDownload}
                aria-label="Downloads allowed"
              />
            </label>
            <Button
              className="w-full"
              onClick={() => comingSoon("Share the gallery with the client")}
            >
              <Send aria-hidden />
              {galerie.statut === "EN_TRI" ? "Share with the client" : "Update sharing"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface p-2">
                <p className="text-lg font-bold text-charcoal">{favoris.length}</p>
                <p className="text-[0.7rem] text-muted-foreground">Favorites</p>
              </div>
              <div className="rounded-lg bg-surface p-2">
                <p className="text-lg font-bold text-charcoal">{galerie.nombreSelection}</p>
                <p className="text-[0.7rem] text-muted-foreground">Selection</p>
              </div>
              <div className="rounded-lg bg-surface p-2">
                <p className="text-lg font-bold text-charcoal">{commentaires.length}</p>
                <p className="text-[0.7rem] text-muted-foreground">Comments</p>
              </div>
            </div>
            {commentaires.slice(0, 2).map((photo) => (
              <div key={photo.id} className="flex gap-3 rounded-lg border p-2.5">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  <SafeImage
                    src={photo.urlMiniature}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <p className="text-xs text-slate">
                  <MessageSquare className="mr-1 inline size-3 text-muted-foreground" aria-hidden />
                  {photo.commentaireClient}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <AIPanel
          title="Story order"
          description="The AI suggests a chronological, narrative order for the gallery."
        >
          <Button
            variant="ai"
            className="w-full"
            onClick={() => comingSoon("Generate the AI story order")}
          >
            <Wand2 aria-hidden />
            Generate AI order
          </Button>
        </AIPanel>
      </aside>
    </div>
  );
}
