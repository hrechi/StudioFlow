"use client";

import { MessageSquareReply, MessagesSquare, RefreshCw, Send, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, labelsOf } from "@/components/shared/filters";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { formatDate } from "@/lib/utils";
import {
  generateFeedbackReplyAction,
  moderateAvisAction,
  retryAvisAnalysisAction,
  saveAvisReplyAction,
} from "../avis.actions";
import {
  sentimentConfig,
  topicLabels,
  type Avis,
  type AvisInsights as AvisInsightsData,
  type Sentiment,
  type TopicAvis,
} from "../avis.types";
import { AvisInsights } from "./avis-insights";
import { SentimentBadge } from "./sentiment-badge";

const PUBLICATION = {
  publies: "Published",
  masques: "Not published",
  sansReponse: "Unanswered",
} as const;

/** /dashboard/avis — AI insights, reviews with AI sentiment/topics, studio reply and publish toggle. */
export function AvisBoard({ avis, insights }: { avis: Avis[]; insights: AvisInsightsData }) {
  const [sentiment, setSentiment] = useState<Sentiment | typeof ALL>(ALL);
  const [topic, setTopic] = useState<TopicAvis | typeof ALL>(ALL);
  const [filtre, setFiltre] = useState<keyof typeof PUBLICATION | typeof ALL>(ALL);
  const [published, setPublished] = useState(() => new Map(avis.map((a) => [a.id, a.estPublie])));
  const [replies, setReplies] = useState(
    () => new Map(avis.map((a) => [a.id, a.reponseStudio ?? ""])),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // The AI only proposes: a generated draft stays in the editor until staff publish it.
  const [aiDraft, setAiDraft] = useState(false);
  const [isPending, startTransition] = useTransition();

  const generateDraft = (id: string) =>
    startTransition(async () => {
      const result = await generateFeedbackReplyAction({ id, kind: "avis" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data.draft);
      setAiDraft(true);
      setEditing(id);
    });

  const list = useMemo(
    () =>
      avis
        .filter((a) => sentiment === ALL || a.sentimentIA === sentiment)
        .filter((a) => topic === ALL || a.topicsIA?.includes(topic))
        .filter((a) => {
          if (filtre === "publies") return published.get(a.id);
          if (filtre === "masques") return !published.get(a.id);
          if (filtre === "sansReponse") return !replies.get(a.id);
          return true;
        }),
    [avis, sentiment, topic, filtre, published, replies],
  );

  return (
    <div className="space-y-4">
      <AvisInsights insights={insights} topic={topic} onTopicChange={setTopic} />
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={sentiment}
          onChange={setSentiment}
          options={labelsOf(sentimentConfig)}
          allLabel="All sentiments"
          label="Filter by AI sentiment"
        />
        <FilterSelect
          value={topic}
          onChange={setTopic}
          options={topicLabels}
          allLabel="All topics"
          label="Filter by AI topic"
        />
        <FilterSelect
          value={filtre}
          onChange={setFiltre}
          options={PUBLICATION}
          allLabel="All reviews"
          label="Filter by publication"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No reviews"
          description="No review matches these filters."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((a) => {
            const reply = replies.get(a.id);
            return (
              <li key={a.id}>
                <Card className="h-full gap-3 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar {...a.client} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{fullName(a.client)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.seance.titre} · {formatDate(a.dateAvis)}
                      </p>
                    </div>
                    <RatingStars value={a.note} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate">“{a.commentaire}”</p>
                  {a.statutAnalyseIA === "TERMINEE" ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SentimentBadge sentiment={a.sentimentIA} score={a.scoreSentimentIA} />
                      {a.topicsIA?.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTopic(t)}
                          className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs text-slate hover:bg-accent"
                          title="Show reviews about this topic"
                        >
                          {topicLabels[t]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-ai" aria-hidden />
                      {a.statutAnalyseIA === "ECHOUEE" ? "AI analysis failed" : "Not analyzed yet"}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await retryAvisAnalysisAction(a.id);
                            if (result.ok) toast.success("Review analyzed");
                            else toast.error(result.error);
                          })
                        }
                      >
                        <RefreshCw aria-hidden />
                        Analyze
                      </Button>
                    </div>
                  )}

                  {reply && editing !== a.id && (
                    <div className="rounded-lg bg-surface p-3 text-sm">
                      <p className="mb-1 text-xs font-semibold text-primary-text">Studio reply</p>
                      <p className="text-slate">{reply}</p>
                    </div>
                  )}
                  {editing === a.id && (
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        startTransition(async () => {
                          const result = await saveAvisReplyAction({ id: a.id, reponse: draft });
                          if (!result.ok) {
                            toast.error(result.error);
                            return;
                          }
                          setReplies((prev) => new Map(prev).set(a.id, draft.trim()));
                          setEditing(null);
                          toast.success("Reply published");
                        });
                      }}
                    >
                      {aiDraft && (
                        <p className="flex items-center gap-1.5 text-xs text-ai-text">
                          <Sparkles className="size-3.5" aria-hidden />
                          AI draft — review and edit it. Nothing is sent until you publish.
                        </p>
                      )}
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={aiDraft ? 6 : 3}
                        aria-label={`Reply to ${fullName(a.client)}`}
                        className="bg-card"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="ai-soft"
                          size="sm"
                          disabled={isPending}
                          onClick={() => generateDraft(a.id)}
                        >
                          <Sparkles aria-hidden />
                          {aiDraft ? "Regenerate" : "AI draft"}
                        </Button>
                        <Button type="submit" size="sm" disabled={!draft.trim() || isPending}>
                          <Send aria-hidden />
                          Publish reply
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <label className="flex items-center gap-2 text-sm text-slate">
                      <Switch
                        checked={published.get(a.id) ?? false}
                        onCheckedChange={(checked) => {
                          startTransition(async () => {
                            const result = await moderateAvisAction({
                              id: a.id,
                              statut: checked ? "PUBLIE" : "EN_ATTENTE",
                            });
                            if (!result.ok) {
                              toast.error(result.error);
                              return;
                            }
                            setPublished((prev) => new Map(prev).set(a.id, checked));
                            toast.success(checked ? "Review published" : "Review hidden");
                          });
                        }}
                        aria-label="Publish on the website"
                      />
                      Published on the website
                    </label>
                    {editing !== a.id && (
                      <div className="flex gap-2">
                        <Button
                          variant="ai-soft"
                          size="sm"
                          onClick={() => generateDraft(a.id)}
                          disabled={isPending}
                        >
                          <Sparkles aria-hidden />
                          Generate reply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraft(reply ?? "");
                            setAiDraft(false);
                            setEditing(a.id);
                          }}
                        >
                          <MessageSquareReply aria-hidden />
                          {reply ? "Edit reply" : "Reply"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
