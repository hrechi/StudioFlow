"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  ListChecks,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AIPanel } from "@/components/shared/ai-panel";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Galerie, Photo } from "../galerie.types";

type View = "galerie" | "favoris" | "selection" | "commentaires";

/** /espace-client/galeries/[id] — client proofing gallery (charter screen 3). */
export function ClientGallery({ galerie, photos }: { galerie: Galerie; photos: Photo[] }) {
  const visiblePhotos = useMemo(
    () => photos.filter((p) => p.statutCulling !== "REJETEE"),
    [photos],
  );
  const [view, setView] = useState<View>("galerie");
  const [favoris, setFavoris] = useState(
    () => new Set(visiblePhotos.filter((p) => p.estFavori).map((p) => p.id)),
  );
  const [selection, setSelection] = useState(
    () => new Set(visiblePhotos.filter((p) => p.estSelectionnee).map((p) => p.id)),
  );
  const [comments, setComments] = useState(
    () =>
      new Map(
        visiblePhotos
          .filter((p) => p.commentaireClient)
          .map((p) => [p.id, p.commentaireClient as string]),
      ),
  );
  const [draft, setDraft] = useState("");
  const [currentId, setCurrentId] = useState(visiblePhotos[0]?.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const list = useMemo(() => {
    if (view === "favoris") return visiblePhotos.filter((p) => favoris.has(p.id));
    if (view === "selection") return visiblePhotos.filter((p) => selection.has(p.id));
    if (view === "commentaires") return visiblePhotos.filter((p) => comments.has(p.id));
    return visiblePhotos;
  }, [view, visiblePhotos, favoris, selection, comments]);

  const index = Math.max(
    0,
    list.findIndex((p) => p.id === currentId),
  );
  const current = list[index] ?? list[0];
  const go = (delta: number) => {
    if (!list.length) return;
    setCurrentId(list[(index + delta + list.length) % list.length].id);
  };
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const recommandations = visiblePhotos
    .filter((p) => !favoris.has(p.id) && p.scoreQualite >= 85)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList variant="line" className="border-b">
            <TabsTrigger value="galerie">Gallery · {visiblePhotos.length}</TabsTrigger>
            <TabsTrigger value="favoris">
              <Heart aria-hidden />
              Favorites · {favoris.size}
            </TabsTrigger>
            <TabsTrigger value="selection">
              <ListChecks aria-hidden />
              Selection · {selection.size}
            </TabsTrigger>
            <TabsTrigger value="commentaires">
              <MessageSquare aria-hidden />
              Comments · {comments.size}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          {galerie.telechargementAutorise && (
            <Button asChild variant="outline">
              <a href={`/api/galeries/${galerie.id}/zip`} download>
                <Download aria-hidden />
                Download all (.zip)
              </a>
            </Button>
          )}
          <Button onClick={() => setConfirmOpen(true)} disabled={selection.size === 0}>
            <CheckCircle2 aria-hidden />
            Approve my selection
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-3">
          {current ? (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-charcoal">
                <div className="relative aspect-[3/2]">
                  <SafeImage
                    src={current.url}
                    alt={current.tagsIA.join(", ")}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-contain"
                    priority
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 hover:text-white"
                >
                  <ChevronLeft aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 hover:text-white"
                >
                  <ChevronRight aria-hidden />
                </Button>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-charcoal/80 to-transparent p-4">
                  <span className="text-sm font-medium text-white/85">
                    {index + 1} / {list.length}
                  </span>
                  <div className="flex gap-2">
                    {galerie.telechargementAutorise && (
                      <Button
                        asChild
                        size="sm"
                        className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      >
                        <a
                          href={`${current.url}?download=1`}
                          download
                          aria-label={`Download ${current.nomFichier}`}
                        >
                          <Download aria-hidden />
                          Download
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => toggle(favoris, setFavoris, current.id)}
                      aria-pressed={favoris.has(current.id)}
                      className={cn(
                        "rounded-full",
                        favoris.has(current.id)
                          ? "bg-destructive text-white hover:bg-destructive-text"
                          : "bg-white/20 text-white backdrop-blur hover:bg-white/30",
                      )}
                    >
                      <Heart
                        className={cn(favoris.has(current.id) && "fill-current")}
                        aria-hidden
                      />
                      {favoris.has(current.id) ? "Favorite" : "Add to favorites"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => toggle(selection, setSelection, current.id)}
                      aria-pressed={selection.has(current.id)}
                      className={cn(
                        "rounded-full",
                        selection.has(current.id)
                          ? "bg-success text-white hover:bg-success-text"
                          : "bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {selection.has(current.id) ? (
                        <CheckCircle2 aria-hidden />
                      ) : (
                        <Plus aria-hidden />
                      )}
                      {selection.has(current.id) ? "In my selection" : "Select"}
                    </Button>
                  </div>
                </div>
              </div>

              <ul className="flex gap-2 overflow-x-auto pb-2" aria-label="Thumbnails">
                {list.map((photo) => (
                  <li key={photo.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentId(photo.id)}
                      aria-current={photo.id === current.id}
                      aria-label={`View ${photo.nomFichier}`}
                      className={cn(
                        "relative block h-16 w-24 overflow-hidden rounded-lg ring-offset-2 transition-all",
                        photo.id === current.id
                          ? "ring-3 ring-primary"
                          : "opacity-75 hover:opacity-100",
                      )}
                    >
                      <SafeImage
                        src={photo.urlMiniature}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      {favoris.has(photo.id) && (
                        <Heart
                          className="absolute top-1 right-1 size-3.5 fill-white text-white drop-shadow"
                          aria-hidden
                        />
                      )}
                      {selection.has(photo.id) && (
                        <CheckCircle2
                          className="absolute bottom-1 left-1 size-3.5 rounded-full bg-success text-white"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="grid aspect-[3/2] place-items-center rounded-2xl border border-dashed bg-card text-center text-sm text-muted-foreground">
              {view === "favoris"
                ? "Add photos to your favorites with the heart."
                : view === "selection"
                  ? "Your selection is empty."
                  : "No comments yet."}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" aria-hidden />
                Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {current && comments.get(current.id) && (
                <p className="rounded-lg bg-surface p-3 text-sm text-slate">
                  {comments.get(current.id)}
                </p>
              )}
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!current || !draft.trim()) return;
                  setComments((prev) => new Map(prev).set(current.id, draft.trim()));
                  setDraft("");
                  toast.success("Comment added", {
                    description: "The studio will see it on this photo.",
                  });
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  aria-label="Your comment on this photo"
                  placeholder="A retouch, a crop, a note about this photo…"
                  className="bg-card"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={!draft.trim() || !current}
                >
                  <Send aria-hidden />
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>

          <AIPanel
            title="Recommendations"
            description="Photos close to your favorites, with the best quality score."
          >
            {recommandations.length ? (
              <ul className="grid grid-cols-3 gap-2">
                {recommandations.map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setView("galerie");
                        setCurrentId(photo.id);
                      }}
                      className="relative block aspect-square w-full overflow-hidden rounded-lg ring-ai/30 hover:ring-2"
                      aria-label="View the recommended photo"
                    >
                      <SafeImage
                        src={photo.urlMiniature}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a few favorites to get suggestions.
              </p>
            )}
            <Button
              variant="ai-soft"
              size="sm"
              className="mt-3 w-full"
              onClick={() => comingSoon("Story order suggested by the AI")}
            >
              <Sparkles aria-hidden />
              Suggested order for my album
            </Button>
          </AIPanel>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Approve your selection of ${selection.size} photo${selection.size > 1 ? "s" : ""}?`}
        description="The studio will start retouching these photos. You won't be able to change the selection afterwards."
        confirmLabel="Approve my selection"
        onConfirm={() => {
          setConfirmOpen(false);
          comingSoon("Approve the selection (galerie.service)");
        }}
      />
    </div>
  );
}
