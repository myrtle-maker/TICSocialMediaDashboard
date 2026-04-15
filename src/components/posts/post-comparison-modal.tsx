"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, Minus } from "lucide-react";
import type { SocialPost } from "@/types/social";
import type { HookType, ContentType } from "@/types/social";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, formatPercentage, truncateText } from "@/lib/utils";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PostComparisonModalProps {
  posts: SocialPost[];
  isOpen: boolean;
  onClose: () => void;
  postA?: SocialPost;
  postB?: SocialPost;
}

interface MetricRow {
  label: string;
  valueA: number;
  valueB: number;
  format: "number" | "percentage" | "score";
}

function formatMetricValue(value: number, format: MetricRow["format"]): string {
  switch (format) {
    case "percentage":
      return formatPercentage(value);
    case "score":
      return `${value}/100`;
    default:
      return formatNumber(value);
  }
}

function generateComparisonInsights(a: SocialPost, b: SocialPost): string[] {
  const insights: string[] = [];

  // Determine winner by engagement rate
  const winner = a.engagementRate >= b.engagementRate ? "A" : "B";
  const winnerPost = winner === "A" ? a : b;
  const loserPost = winner === "A" ? b : a;

  // Hook type comparison
  if (a.hookType !== b.hookType) {
    const winnerHook = HOOK_TYPE_LABELS[winnerPost.hookType as HookType] ?? winnerPost.hookType;
    const loserHook = HOOK_TYPE_LABELS[loserPost.hookType as HookType] ?? loserPost.hookType;
    insights.push(
      `Post ${winner} used a "${winnerHook}" hook while the other used "${loserHook}", which may have driven higher engagement.`
    );
  }

  // Content type comparison
  if (a.contentType !== b.contentType) {
    const winnerContent = CONTENT_TYPE_LABELS[winnerPost.contentType as ContentType] ?? winnerPost.contentType;
    const loserContent = CONTENT_TYPE_LABELS[loserPost.contentType as ContentType] ?? loserPost.contentType;
    insights.push(
      `"${winnerContent}" content (Post ${winner}) outperformed "${loserContent}" content in this comparison.`
    );
  }

  // Caption length comparison
  const aLen = a.caption.length;
  const bLen = b.caption.length;
  if (Math.abs(aLen - bLen) > 50) {
    const longerPost = aLen > bLen ? "A" : "B";
    const longerLen = Math.max(aLen, bLen);
    const shorterLen = Math.min(aLen, bLen);
    if (longerPost === winner) {
      insights.push(
        `The winning post had a longer caption (${longerLen} vs ${shorterLen} chars), suggesting more detailed captions performed better here.`
      );
    } else {
      insights.push(
        `The winning post had a shorter caption (${shorterLen} vs ${longerLen} chars), suggesting concise messaging worked better here.`
      );
    }
  }

  // Hashtag count comparison
  const aHashtags = a.hashtags.length;
  const bHashtags = b.hashtags.length;
  if (aHashtags !== bHashtags) {
    const moreHashtagPost = aHashtags > bHashtags ? "A" : "B";
    if (moreHashtagPost === winner) {
      insights.push(
        `Post ${winner} used more hashtags (${Math.max(aHashtags, bHashtags)} vs ${Math.min(aHashtags, bHashtags)}), which may have improved discoverability.`
      );
    }
  }

  // Posting time comparison
  const aDate = new Date(a.publishedAt);
  const bDate = new Date(b.publishedAt);
  const aHour = aDate.getHours();
  const bHour = bDate.getHours();
  if (Math.abs(aHour - bHour) >= 3) {
    const winnerHour = winner === "A" ? aHour : bHour;
    const period = winnerHour < 12 ? "morning" : winnerHour < 17 ? "afternoon" : "evening";
    insights.push(
      `Post ${winner} was published in the ${period} (${winnerHour}:00), which may have reached a more active audience.`
    );
  }

  // Hook score comparison
  if (Math.abs(a.hookScore - b.hookScore) >= 10) {
    insights.push(
      `Post ${winner} had a stronger hook score (${winnerPost.hookScore} vs ${loserPost.hookScore}), indicating a more compelling opening.`
    );
  }

  if (insights.length === 0) {
    insights.push(
      "Both posts share similar attributes. The difference in performance may be attributed to audience timing or algorithmic factors."
    );
  }

  return insights;
}

function PostSelector({
  posts,
  selectedId,
  onSelect,
  label,
}: {
  posts: SocialPost[];
  selectedId: string | null;
  onSelect: (post: SocialPost) => void;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <h4 className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </h4>
      <div className="max-h-[300px] space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelect(post)}
            className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${
              selectedId === post.id
                ? "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                {truncateText(post.caption, 60)}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <PlatformIcon platform={post.platform} size="sm" />
                <span className="text-[10px] text-zinc-400">
                  {formatPercentage(post.engagementRate)} ER
                </span>
              </div>
            </div>
            {selectedId === post.id && (
              <Check className="h-4 w-4 shrink-0 text-blue-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComparisonView({ postA, postB }: { postA: SocialPost; postB: SocialPost }) {
  const metrics: MetricRow[] = useMemo(
    () => [
      { label: "Views", valueA: postA.views, valueB: postB.views, format: "number" },
      { label: "Likes", valueA: postA.likes, valueB: postB.likes, format: "number" },
      { label: "Comments", valueA: postA.comments, valueB: postB.comments, format: "number" },
      { label: "Shares", valueA: postA.shares, valueB: postB.shares, format: "number" },
      { label: "Saves", valueA: postA.saves, valueB: postB.saves, format: "number" },
      {
        label: "Engagement Rate",
        valueA: postA.engagementRate,
        valueB: postB.engagementRate,
        format: "percentage",
      },
      { label: "Hook Score", valueA: postA.hookScore, valueB: postB.hookScore, format: "score" },
    ],
    [postA, postB]
  );

  const insights = useMemo(
    () => generateComparisonInsights(postA, postB),
    [postA, postB]
  );

  const winner = postA.engagementRate >= postB.engagementRate ? "A" : "B";

  return (
    <div>
      {/* Side-by-side post headers */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[postA, postB].map((post, idx) => (
          <div
            key={post.id}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {idx === 0 ? "A" : "B"}
              </span>
              <PlatformIcon platform={post.platform} size="sm" />
              <Badge variant="secondary" className="text-[10px]">
                {CONTENT_TYPE_LABELS[post.contentType]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {HOOK_TYPE_LABELS[post.hookType]}
              </Badge>
            </div>
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt=""
                className="mb-2 h-24 w-full rounded-md object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  el.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`mb-2 flex h-24 w-full items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 ${post.thumbnailUrl ? "hidden" : ""}`}>
              No thumbnail
            </div>
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {truncateText(post.caption, 150)}
            </p>
          </div>
        ))}
      </div>

      {/* Metrics comparison table */}
      <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Metric
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Post A
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Post B
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const aWins = metric.valueA > metric.valueB;
              const bWins = metric.valueB > metric.valueA;
              const tie = metric.valueA === metric.valueB;

              return (
                <tr
                  key={metric.label}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {metric.label}
                  </td>
                  <td
                    className={`px-3 py-2 text-right text-xs font-semibold ${
                      tie
                        ? "text-zinc-600 dark:text-zinc-400"
                        : aWins
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatMetricValue(metric.valueA, metric.format)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right text-xs font-semibold ${
                      tie
                        ? "text-zinc-600 dark:text-zinc-400"
                        : bWins
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatMetricValue(metric.valueB, metric.format)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Why Post X Outperformed */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 dark:bg-blue-950/50 dark:border-blue-800">
        <h4 className="mb-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
          Why Post {winner} Outperformed
        </h4>
        <ul className="space-y-1.5">
          {insights.map((insight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs leading-relaxed text-blue-700 dark:text-blue-300"
            >
              <Minus className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PostComparisonModal({
  posts,
  isOpen,
  onClose,
  postA: initialPostA,
  postB: initialPostB,
}: PostComparisonModalProps) {
  const [selectedA, setSelectedA] = useState<SocialPost | null>(
    initialPostA ?? null
  );
  const [selectedB, setSelectedB] = useState<SocialPost | null>(
    initialPostB ?? null
  );

  const hasPreselected = !!(initialPostA && initialPostB);
  const bothSelected = !!(selectedA && selectedB);

  function handleOpenChange(open: boolean) {
    if (!open) {
      if (!hasPreselected) {
        setSelectedA(null);
        setSelectedB(null);
      }
      onClose();
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-xl border glass-elevated p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <Dialog.Title className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Compare Posts
          </Dialog.Title>

          {bothSelected ? (
            <>
              {!hasPreselected && (
                <div className="mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedA(null);
                      setSelectedB(null);
                    }}
                  >
                    &larr; Change selection
                  </Button>
                </div>
              )}
              <ComparisonView postA={selectedA} postB={selectedB} />
            </>
          ) : (
            <>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Select one post from each column to compare.
              </p>
              <div className="flex flex-col gap-4 md:flex-row">
                <PostSelector
                  posts={posts}
                  selectedId={selectedA?.id ?? null}
                  onSelect={setSelectedA}
                  label="Select Post A"
                />
                <PostSelector
                  posts={posts}
                  selectedId={selectedB?.id ?? null}
                  onSelect={setSelectedB}
                  label="Select Post B"
                />
              </div>
              {selectedA && selectedB && (
                <div className="mt-3 text-center">
                  <Button size="sm" onClick={() => {}}>
                    Compare
                  </Button>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
