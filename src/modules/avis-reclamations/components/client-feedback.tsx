"use client";

import { CheckCircle2, Circle, CircleDot, MessageSquareWarning, Send, Star } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { RatingInput, RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import { createAvisAction, createReclamationAction } from "../avis.actions";
import {
  CATEGORIES_RECLAMATION,
  categorieReclamationLabels,
  statutReclamationConfig,
  type Avis,
  type Reclamation,
  type StatutReclamation,
} from "../avis.types";

const STEPS: StatutReclamation[] = ["OUVERTE", "EN_COURS", "RESOLUE"];

/** /espace-client/avis — rate a completed séance, file a complaint, follow its status. */
export function ClientFeedback({
  seancesANoter,
  mesAvis,
  mesReclamations,
}: {
  seancesANoter: { id: string; titre: string }[];
  mesAvis: Avis[];
  mesReclamations: Reclamation[];
}) {
  const [note, setNote] = useState(0);
  const [seanceAvis, setSeanceAvis] = useState(seancesANoter[0]?.id ?? "");
  const [commentaire, setCommentaire] = useState("");
  const [seanceRec, setSeanceRec] = useState(seancesANoter[0]?.id ?? "");
  const [categorie, setCategorie] = useState("QUALITE");
  const [objet, setObjet] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="size-4 text-warning" aria-hidden />
            Rate a session
          </CardTitle>
          <CardDescription>
            Your review helps the studio improve and may be published on the website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await createAvisAction({
                  note,
                  commentaire,
                  seanceId: seanceAvis,
                  seanceTitre: seancesANoter.find((s) => s.id === seanceAvis)?.titre,
                });
                if (!result.ok) {
                  toast.warning("Review not sent", {
                    description: result.error,
                  });
                  setFeedback(result.error);
                  return;
                }
                toast.success("Review submitted", {
                  description: "Your review is awaiting moderation.",
                });
                setFeedback("Review submitted for moderation.");
                if (result.ok) {
                  setCommentaire("");
                  setNote(0);
                }
              });
            }}
          >
            <FormField id="seance-avis" label="Completed session" required>
              <Select value={seanceAvis} onValueChange={setSeanceAvis}>
                <SelectTrigger id="seance-avis" className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seancesANoter.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium text-slate">Your rating</legend>
              <RatingInput value={note} onChange={setNote} />
            </fieldset>
            <FormField id="commentaire-avis" label="Your review" required>
              <Textarea
                id="commentaire-avis"
                rows={4}
                placeholder="Tell us about your experience…"
                className="bg-card"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </FormField>
            <Button type="submit" disabled={note === 0 || !commentaire.trim() || isPending}>
              <Send aria-hidden />
              Send my review
            </Button>
            {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareWarning className="size-4 text-destructive" aria-hidden />
            File a complaint
          </CardTitle>
          <CardDescription>
            A delay, a photo, an invoice? The studio will get back to you quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await createReclamationAction({
                  objet,
                  description,
                  categorie,
                  seanceId: seanceRec,
                  seanceTitre: seancesANoter.find((s) => s.id === seanceRec)?.titre,
                });
                setFeedback(result.ok ? "Complaint sent to the studio." : result.error);
                if (result.ok) {
                  setObjet("");
                  setDescription("");
                }
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="seance-rec" label="Related session" required>
                <Select value={seanceRec} onValueChange={setSeanceRec}>
                  <SelectTrigger id="seance-rec" className="h-10 w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seancesANoter.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="categorie-rec" label="Category" required>
                <Select value={categorie} onValueChange={setCategorie}>
                  <SelectTrigger id="categorie-rec" className="h-10 w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES_RECLAMATION.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categorieReclamationLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField id="objet-rec" label="Subject" required>
              <Input
                id="objet-rec"
                placeholder="e.g. Blurry photo in my selection"
                className="h-10 bg-card"
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
              />
            </FormField>
            <FormField id="description-rec" label="Description" required>
              <Textarea
                id="description-rec"
                rows={3}
                className="bg-card"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            <Button
              type="submit"
              variant="outline"
              disabled={!objet.trim() || !description.trim() || isPending}
            >
              <Send aria-hidden />
              Send complaint
            </Button>
            {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>My complaints</CardTitle>
        </CardHeader>
        <CardContent>
          {mesReclamations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No complaints, great!</p>
          ) : (
            <ul className="divide-y">
              {mesReclamations.map((r) => {
                const current = STEPS.indexOf(r.statut);
                return (
                  <li key={r.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{r.objet}</p>
                        <StatusBadge value={r.statut} config={statutReclamationConfig} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.seance.titre} · sent {formatDate(r.dateCreation)}
                      </p>
                      {r.reponse && (
                        <p className="mt-2 rounded-lg bg-surface p-2.5 text-sm text-slate">
                          Studio: {r.reponse}
                        </p>
                      )}
                    </div>
                    {r.statut !== "REJETEE" && (
                      <ol className="flex items-center gap-1.5 text-xs" aria-label="Progress">
                        {STEPS.map((step, index) => (
                          <li key={step} className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "flex items-center gap-1",
                                index <= current
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {index < current || r.statut === "RESOLUE" ? (
                                <CheckCircle2 className="size-4 text-success" aria-hidden />
                              ) : index === current ? (
                                <CircleDot className="size-4 text-primary" aria-hidden />
                              ) : (
                                <Circle className="size-4 text-light-gray" aria-hidden />
                              )}
                              {statutReclamationConfig[step].label}
                            </span>
                            {index < STEPS.length - 1 && (
                              <span className="h-px w-4 bg-light-gray" aria-hidden />
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {mesAvis.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {mesAvis.map((a) => (
                <li key={a.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars value={a.note} />
                    <span className="text-xs text-muted-foreground">
                      {a.seance.titre} · {formatDate(a.dateAvis)}
                    </span>
                  </div>
                  <p className="text-sm text-slate">“{a.commentaire}”</p>
                  {a.reponseStudio && (
                    <p className="text-sm text-primary-text">Studio reply: {a.reponseStudio}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
