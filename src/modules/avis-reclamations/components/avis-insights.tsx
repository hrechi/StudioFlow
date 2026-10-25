"use client";

import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ALL } from "@/components/shared/filters";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SENTIMENTS,
  sentimentConfig,
  topicLabels,
  type AvisInsights as AvisInsightsData,
  type Sentiment,
  type TopicAvis,
} from "../avis.types";

type Counts = Record<Sentiment, number> & { total: number };

/** Diverging: positive and negative poles, neutral gray midpoint (same hues as SentimentBadge). */
const fill: Record<Sentiment, string> = {
  POSITIF: "bg-success",
  NEUTRE: "bg-gray/45",
  NEGATIF: "bg-destructive",
};
// Stacked left to right: negative first, so the bars line up on what needs attention.
const STACK: Sentiment[] = ["NEGATIF", "NEUTRE", "POSITIF"];

const empty = (): Counts => ({ POSITIF: 0, NEUTRE: 0, NEGATIF: 0, total: 0 });

function monthLabel(month: string, format: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-GB", {
    month: format,
    ...(format === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function breakdown(c: Counts) {
  return STACK.map((s) => `${c[s]} ${sentimentConfig[s].label.toLowerCase()}`).join(" · ");
}

/** /dashboard/avis — AI sentiment × topic charts. Clicking a topic filters the review list. */
export function AvisInsights({
  insights,
  topic,
  onTopicChange,
}: {
  insights: AvisInsightsData;
  topic: TopicAvis | typeof ALL;
  onTopicChange: (topic: TopicAvis | typeof ALL) => void;
}) {
  const { months, rows } = insights;
  const [month, setMonth] = useState(months[months.length - 1]);

  const { monthTotal, byTopic, negativesPerMonth } = useMemo(() => {
    const monthTotal = empty();
    const topics = new Map<TopicAvis, Counts>();
    const negatives = new Map(months.map((m) => [m, 0]));
    for (const row of rows) {
      const scope = topic === ALL ? null : topic;
      if (row.topic === scope && row.sentiment === "NEGATIF" && negatives.has(row.month)) {
        negatives.set(row.month, row.count);
      }
      if (row.month !== month) continue;
      const target = row.topic === null ? monthTotal : (topics.get(row.topic) ?? empty());
      target[row.sentiment] += row.count;
      target.total += row.count;
      if (row.topic) topics.set(row.topic, target);
    }
    return {
      monthTotal,
      byTopic: [...topics.entries()].sort(
        ([, a], [, b]) => b.NEGATIF - a.NEGATIF || b.total - a.total,
      ),
      negativesPerMonth: months.map((m) => ({ month: m, count: negatives.get(m) ?? 0 })),
    };
  }, [rows, months, month, topic]);

  const maxTopic = Math.max(1, ...byTopic.map(([, c]) => c.total));
  const maxNegatives = Math.max(1, ...negativesPerMonth.map((m) => m.count));
  const focus =
    topic !== ALL ? byTopic.find(([t]) => t === topic) : byTopic.find(([, c]) => c.NEGATIF > 0);
  const focusTopic = topic !== ALL ? topic : focus?.[0];
  const focusNegatives = focus?.[1].NEGATIF ?? 0;

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles className="size-4 text-ai" aria-hidden />
            Review insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Sentiment and topics detected by the AI on every analyzed review.
          </p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-44 bg-card" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...months].reverse().map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Headline: the one number the demo leads with */}
      <div className="flex items-center gap-4 rounded-lg bg-surface p-4">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            focusNegatives
              ? "bg-destructive/10 text-destructive-text"
              : "bg-success/10 text-success-text",
          )}
        >
          {focusNegatives ? (
            <ThumbsDown className="size-5" aria-hidden />
          ) : (
            <ThumbsUp className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-base text-foreground">
            {focusTopic && focusNegatives ? (
              <>
                <strong className="text-2xl font-semibold tabular-nums">{focusNegatives}</strong>{" "}
                negative review{focusNegatives > 1 ? "s" : ""} about{" "}
                <strong className="font-semibold">{topicLabels[focusTopic].toLowerCase()}</strong>{" "}
                in {monthLabel(month)}
              </>
            ) : (
              <>
                No negative reviews
                {topic !== ALL && <> about {topicLabels[topic].toLowerCase()}</>} in{" "}
                {monthLabel(month)}
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {monthTotal.total
              ? `${monthTotal.total} analyzed review${monthTotal.total > 1 ? "s" : ""} this month · ${Math.round((monthTotal.NEGATIF / monthTotal.total) * 100)}% negative${topic === ALL && focusTopic ? " · most criticized topic" : ""}`
              : "No analyzed reviews this month yet."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sentiment by topic: horizontal stacked bars */}
        <section className="lg:col-span-3" aria-labelledby="insights-topics">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="insights-topics" className="text-sm font-semibold text-foreground">
              Sentiment by topic
            </h3>
            <ul className="flex gap-3 text-xs text-muted-foreground" aria-label="Legend">
              {STACK.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-sm", fill[s])} aria-hidden />
                  {sentimentConfig[s].label}
                </li>
              ))}
            </ul>
          </div>
          {byTopic.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No topics detected in {monthLabel(month)}.
            </p>
          ) : (
            <ul className="space-y-1">
              {byTopic.map(([t, c]) => {
                const selected = topic === t;
                return (
                  <li key={t}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onTopicChange(selected ? ALL : t)}
                          aria-pressed={selected}
                          aria-label={`${topicLabels[t]}: ${breakdown(c)}. ${selected ? "Clear filter" : "Show these reviews"}`}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                            selected && "bg-muted ring-1 ring-border",
                          )}
                        >
                          <span className="w-32 shrink-0 truncate text-slate">
                            {topicLabels[t]}
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                              className="flex h-5 gap-0.5 overflow-hidden rounded-r"
                              style={{ width: `${(c.total / maxTopic) * 100}%` }}
                            >
                              {STACK.filter((s) => c[s] > 0).map((s) => (
                                <span
                                  key={s}
                                  className={cn("h-full", fill[s])}
                                  style={{ flexGrow: c[s], flexBasis: 0 }}
                                />
                              ))}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {c.total}
                            </span>
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {topicLabels[t]} — {breakdown(c)}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            A review can mention several topics. Click a topic to filter the reviews below.
          </p>
        </section>

        {/* Negative reviews per month: single-series columns, selected month in full color */}
        <section className="lg:col-span-2" aria-labelledby="insights-trend">
          <h3 id="insights-trend" className="mb-3 text-sm font-semibold text-foreground">
            Negative reviews per month
            {topic !== ALL && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {topicLabels[topic].toLowerCase()}
              </span>
            )}
          </h3>
          <div className="flex h-40 items-end justify-between gap-1 border-b border-border px-1">
            {negativesPerMonth.map(({ month: m, count }) => (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setMonth(m)}
                    aria-pressed={m === month}
                    aria-label={`${monthLabel(m)}: ${count} negative`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-t-md hover:bg-muted/60"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                    <span
                      className={cn(
                        "w-6 rounded-t",
                        m === month ? "bg-destructive" : "bg-destructive/35",
                      )}
                      style={{
                        height: `${(count / maxNegatives) * 75}%`,
                        minHeight: count ? 4 : 0,
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {monthLabel(m)} — {count} negative review{count === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between gap-1 px-1">
            {negativesPerMonth.map(({ month: m }) => (
              <span
                key={m}
                className={cn(
                  "flex-1 text-center text-xs",
                  m === month ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {monthLabel(m, "short")}
              </span>
            ))}
          </div>
        </section>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show as table
        </summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">Reviews by topic and sentiment, {monthLabel(month)}</caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 font-medium">Topic</th>
              {SENTIMENTS.map((s) => (
                <th key={s} className="py-1.5 text-right font-medium">
                  {sentimentConfig[s].label}
                </th>
              ))}
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {byTopic.map(([t, c]) => (
              <tr key={t} className="border-t">
                <td className="py-1.5 text-slate">{topicLabels[t]}</td>
                {SENTIMENTS.map((s) => (
                  <td key={s} className="py-1.5 text-right">
                    {c[s]}
                  </td>
                ))}
                <td className="py-1.5 text-right font-medium">{c.total}</td>
              </tr>
            ))}
            <tr className="border-t font-semibold">
              <td className="py-1.5">All reviews</td>
              {SENTIMENTS.map((s) => (
                <td key={s} className="py-1.5 text-right">
                  {monthTotal[s]}
                </td>
              ))}
              <td className="py-1.5 text-right">{monthTotal.total}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </Card>
  );
}
