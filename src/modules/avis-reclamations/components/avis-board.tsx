"use client";

import { MessageSquareReply, MessagesSquare, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { comingSoon } from "@/components/shared/coming-soon-button";
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
import { sentimentConfig, type Avis, type Sentiment } from "../avis.types";
import { SentimentBadge } from "./sentiment-badge";

const PUBLICATION = {
  publies: "Published",
  masques: "Not published",
  sansReponse: "Unanswered",
} as const;

/** /dashboard/avis — reviews with AI sentiment, studio reply and publish toggle. */
export function AvisBoard({ avis }: { avis: Avis[] }) {
  const [sentiment, setSentiment] = useState<Sentiment | typeof ALL>(ALL);
  const [filtre, setFiltre] = useState<keyof typeof PUBLICATION | typeof ALL>(ALL);
  const [published, setPublished] = useState(() => new Map(avis.map((a) => [a.id, a.estPublie])));
  const [replies, setReplies] = useState(
    () => new Map(avis.map((a) => [a.id, a.reponseStudio ?? ""])),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const list = useMemo(
    () =>
      avis
        .filter((a) => sentiment === ALL || a.sentimentIA === sentiment)
        .filter((a) => {
          if (filtre === "publies") return published.get(a.id);
          if (filtre === "masques") return !published.get(a.id);
          if (filtre === "sansReponse") return !replies.get(a.id);
          return true;
        }),
    [avis, sentiment, filtre, published, replies],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={sentiment}
          onChange={setSentiment}
          options={labelsOf(sentimentConfig)}
          allLabel="All sentiments"
          label="Filter by AI sentiment"
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
                  <SentimentBadge
                    sentiment={a.sentimentIA}
                    score={a.scoreSentimentIA}
                    className="self-start"
                  />

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
                        setReplies((prev) => new Map(prev).set(a.id, draft.trim()));
                        setEditing(null);
                        toast.success("Reply saved (preview)", {
                          description: "Real sending will be wired up by the module.",
                        });
                      }}
                    >
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
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
                        <Button type="submit" size="sm" disabled={!draft.trim()}>
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
                          setPublished((prev) => new Map(prev).set(a.id, checked));
                          comingSoon(
                            checked
                              ? "Publish the review on the website"
                              : "Remove the review from the website",
                          );
                        }}
                        aria-label="Publish on the website"
                      />
                      Published on the website
                    </label>
                    {editing !== a.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDraft(reply ?? "");
                          setEditing(a.id);
                        }}
                      >
                        <MessageSquareReply aria-hidden />
                        {reply ? "Edit reply" : "Reply"}
                      </Button>
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
