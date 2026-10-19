"use client";

import {
  Check,
  Copy,
  Heart,
  ImageOff,
  ImageUp,
  Link2,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { AIPanel } from "@/components/shared/ai-panel";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField, PasswordInput } from "@/components/shared/form-field";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FieldErrors } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { setCouvertureAction, shareGalerieAction } from "../galerie.actions";
import {
  statutCullingConfig,
  type Galerie,
  type Photo,
  type StatutCulling,
} from "../galerie.types";
import { deletePhotosAction, setCullingAction } from "../photo.actions";
import { AILabels } from "./photo-thumb";

const TABS: { value: StatutCulling | "TOUTES"; label: string }[] = [
  { value: "TOUTES", label: "All" },
  { value: "RETENUE", label: "Kept" },
  { value: "EN_ATTENTE", label: "Pending" },
  { value: "REJETEE", label: "Rejected" },
];

/** /dashboard/galeries/[id] — culling view + share settings + client selection summary. */
export function GalerieManager({ galerie, photos }: { galerie: Galerie; photos: Photo[] }) {
  const router = useRouter();
  const [culling, setCulling] = useState(() => new Map(photos.map((p) => [p.id, p.statutCulling])));
  const [toDelete, setToDelete] = useState<Photo | null>(null);
  const [pending, startTransition] = useTransition();

  // Photos change after an import / delete (router.refresh): resync the local culling map.
  const [syncedPhotos, setSyncedPhotos] = useState(photos);
  if (syncedPhotos !== photos) {
    setSyncedPhotos(photos);
    setCulling(new Map(photos.map((p) => [p.id, p.statutCulling])));
  }

  /** Optimistic: the badge changes at once and is restored if the action fails. */
  const setStatus = (id: string, statut: StatutCulling) => {
    const previous = culling.get(id);
    if (previous === statut) return;
    setCulling((prev) => new Map(prev).set(id, statut));
    startTransition(async () => {
      const result = await setCullingAction({ ids: [id], statut });
      if (!result.ok) {
        toast.error(result.error);
        if (previous) setCulling((prev) => new Map(prev).set(id, previous));
      }
    });
  };

  const setCover = (photo: Photo) =>
    startTransition(async () => {
      const result = await setCouvertureAction({ galerieId: galerie.id, photoId: photo.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cover photo updated");
      router.refresh();
    });

  const deletePhoto = (photo: Photo) =>
    startTransition(async () => {
      const result = await deletePhotosAction({ ids: [photo.id] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${photo.nomFichier} deleted`);
      setToDelete(null);
      router.refresh();
    });

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
                {photos.length === 0 ? (
                  <EmptyState
                    icon={ImageOff}
                    title="No photos yet"
                    description="Use “Import photos” to add the session’s photos to this gallery."
                  />
                ) : list.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No photos in this category.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                    {list.map((photo) => {
                      const status = culling.get(photo.id) ?? photo.statutCulling;
                      const isCover = galerie.photoCouverture === photo.urlMiniature;
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
                            {isCover && (
                              <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-semibold text-slate shadow-sm">
                                Cover
                              </span>
                            )}
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
                                aria-label={`Use ${photo.nomFichier} as cover`}
                                title="Use as cover"
                                disabled={isCover || pending}
                                onClick={() => setCover(photo)}
                              >
                                <ImageUp aria-hidden />
                              </Button>
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
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={`Delete ${photo.nomFichier}`}
                                title="Delete"
                                className="text-destructive-text hover:bg-destructive/10"
                                onClick={() => setToDelete(photo)}
                              >
                                <Trash2 aria-hidden />
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
        <ShareCard galerie={galerie} />

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

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        tone="destructive"
        title={`Delete ${toDelete?.nomFichier ?? "this photo"}?`}
        description="The photo and its file will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete permanently"
        pending={pending}
        onConfirm={() => toDelete && deletePhoto(toDelete)}
      />
    </div>
  );
}

const noopSubscribe = () => () => {};

/** Share settings: password, expiry date, downloads; the first save shares the gallery. */
function ShareCard({ galerie }: { galerie: Galerie }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [download, setDownload] = useState(galerie.telechargementAutorise);
  const [dateExpiration, setDateExpiration] = useState(galerie.dateExpiration.slice(0, 10));
  const [motDePasse, setMotDePasse] = useState("");
  const [retirerMotDePasse, setRetirerMotDePasse] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const enTri = galerie.statut === "EN_TRI";
  // Origin only exists in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const lien = `${origin}${galerie.lienAcces}`;

  const save = () =>
    startTransition(async () => {
      const result = await shareGalerieAction(
        galerie.id,
        { dateExpiration, telechargementAutorise: download, motDePasse, retirerMotDePasse },
        enTri,
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      setMotDePasse("");
      setRetirerMotDePasse(false);
      toast.success(enTri ? "Gallery shared: the client has been notified" : "Sharing updated");
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" aria-hidden />
          Share with the client
        </CardTitle>
        <CardDescription>
          The client sees it in their client area once shared. Guests open the link below with the
          password (view only).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          id="lien"
          label="Guest link"
          hint={enTri ? "Works once the gallery is shared." : undefined}
        >
          <div className="flex gap-2">
            <Input id="lien" readOnly value={lien} className="h-9 bg-surface text-xs" />
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy link"
              onClick={() => {
                void navigator.clipboard?.writeText(lien);
                toast.success("Link copied");
              }}
            >
              <Copy aria-hidden />
            </Button>
          </div>
        </FormField>
        <FormField
          id="motDePasseGalerie"
          label="Password"
          error={errors.motDePasse?.[0]}
          hint={
            galerie.protegeeParMotDePasse ? "Leave empty to keep the current password" : "Optional"
          }
        >
          <PasswordInput
            id="motDePasseGalerie"
            icon={Lock}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            disabled={retirerMotDePasse}
            autoComplete="new-password"
            placeholder={galerie.protegeeParMotDePasse ? "••••••••" : "None"}
            className="h-9"
          />
        </FormField>
        {galerie.protegeeParMotDePasse && (
          <label className="flex items-center justify-between gap-3 text-sm text-slate">
            Remove the password
            <Switch
              checked={retirerMotDePasse}
              onCheckedChange={setRetirerMotDePasse}
              aria-label="Remove the password"
            />
          </label>
        )}
        <FormField id="expiration" label="Expiry date" error={errors.dateExpiration?.[0]}>
          <Input
            id="expiration"
            type="date"
            value={dateExpiration}
            onChange={(e) => setDateExpiration(e.target.value)}
            className="h-9 bg-white"
          />
        </FormField>
        <label className="flex items-center justify-between gap-3 text-sm text-slate">
          Downloads allowed
          <Switch checked={download} onCheckedChange={setDownload} aria-label="Downloads allowed" />
        </label>
        <Button className="w-full" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {enTri ? "Share with the client" : "Update sharing"}
        </Button>
      </CardContent>
    </Card>
  );
}
