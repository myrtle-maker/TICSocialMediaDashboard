import type { Insight, InsightsResponse } from "@/types/insights";
import { PLATFORM_CONFIG, HOOK_TYPE_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import type { Platform, HookType, ContentType } from "@/types/social";
import {
  avg,
  groupBy,
  topN,
  bottomN,
  trendSlope,
  pctDiff,
  formatPct,
  formatMultiplier,
  dayName,
  hourLabel,
  timeBlockLabel,
  percentile,
} from "./insights-helpers";

// ---------------------------------------------------------------------------
// PostRecord — the Prisma-shaped row that arrives as JSON
// ---------------------------------------------------------------------------

type PostRecord = {
  id: string;
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  hookText: string;
  hookType: string;
  hookScore: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  engagementRate: number;
  viralityScore: number;
  publishedAt: string | Date;
  accountId: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toDate(d: string | Date): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** ISO-week key like "2025-W03" */
function weekKey(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86_400_000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function platformLabel(p: string): string {
  return PLATFORM_CONFIG[p as Platform]?.label ?? p;
}

function hookLabel(h: string): string {
  return HOOK_TYPE_LABELS[h as HookType] ?? h;
}

function contentLabel(c: string): string {
  return CONTENT_TYPE_LABELS[c as ContentType] ?? c;
}

/** Most common value in an array. Returns [value, count]. */
function mode(values: string[]): [string, number] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = "";
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return [best, bestN];
}

/** Return sorted entries of a frequency map */
function freqMap(values: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// 1. generateTopPerformersInsight
// ---------------------------------------------------------------------------

function generateTopPerformersInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 8) return [];

  const threshold = percentile(
    posts.map((p) => p.engagementRate),
    75
  );
  const topPosts = posts.filter((p) => p.engagementRate >= threshold);
  if (topPosts.length === 0) return [];

  const overallAvg = avg(posts.map((p) => p.engagementRate));
  const topAvg = avg(topPosts.map((p) => p.engagementRate));

  const insights: Insight[] = [];

  // Check dominant attributes
  const attrs: { field: string; label: (v: string) => string; kind: string }[] = [
    { field: "hookType", label: hookLabel, kind: "hook type" },
    { field: "contentType", label: contentLabel, kind: "content type" },
    { field: "platform", label: platformLabel, kind: "platform" },
  ];

  for (const attr of attrs) {
    const freq = freqMap(topPosts.map((p) => p[attr.field] as string));
    const [dominant, count] = freq[0];
    const share = count / topPosts.length;
    if (share > 0.4) {
      const examplePosts = topN(
        topPosts.filter((p) => p[attr.field] === dominant),
        3,
        (p) => p.engagementRate
      ).map((p) => p.id);

      insights.push({
        id: `perf-top-${attr.field}-${dominant}`,
        category: "performance",
        priority: "high",
        type: "positive",
        title: `${attr.label(dominant)} dominates your top performers`,
        description: `${Math.round(share * 100)}% of your top 25% posts (by engagement) use ${attr.label(dominant)} as their ${attr.kind}. These top posts average ${topAvg.toFixed(1)}% engagement \u2014 ${formatPct(pctDiff(topAvg, overallAvg))} vs your overall average of ${overallAvg.toFixed(1)}%.`,
        metric: formatMultiplier(topAvg / (overallAvg || 1)),
        relatedPosts: examplePosts,
        dataPoints: {
          topAvgER: topAvg,
          overallAvgER: overallAvg,
          dominantAttribute: attr.label(dominant),
          shareInTop: Math.round(share * 100),
        },
      });
    }
  }

  // Fallback: at least one general insight
  if (insights.length === 0) {
    const examplePosts = topN(topPosts, 3, (p) => p.engagementRate).map((p) => p.id);
    insights.push({
      id: "perf-top-performers",
      category: "performance",
      priority: "high",
      type: "positive",
      title: "Top performers average " + topAvg.toFixed(1) + "% engagement",
      description: `Your top 25% of posts average ${topAvg.toFixed(1)}% engagement rate \u2014 ${formatPct(pctDiff(topAvg, overallAvg))} above your overall average of ${overallAvg.toFixed(1)}%. No single attribute dominates; keep experimenting with diverse content.`,
      metric: formatPct(pctDiff(topAvg, overallAvg)),
      relatedPosts: examplePosts,
      dataPoints: { topAvgER: topAvg, overallAvgER: overallAvg },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// 2. generateUnderperformersInsight
// ---------------------------------------------------------------------------

function generateUnderperformersInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 8) return [];

  const threshold = percentile(
    posts.map((p) => p.engagementRate),
    25
  );
  const bottomPosts = posts.filter((p) => p.engagementRate <= threshold);
  if (bottomPosts.length === 0) return [];

  const overallAvg = avg(posts.map((p) => p.engagementRate));
  const botAvg = avg(bottomPosts.map((p) => p.engagementRate));

  const insights: Insight[] = [];

  const attrs: { field: string; label: (v: string) => string; kind: string }[] = [
    { field: "hookType", label: hookLabel, kind: "hook type" },
    { field: "contentType", label: contentLabel, kind: "content type" },
    { field: "platform", label: platformLabel, kind: "platform" },
  ];

  for (const attr of attrs) {
    const freq = freqMap(bottomPosts.map((p) => p[attr.field] as string));
    const [dominant, count] = freq[0];
    const share = count / bottomPosts.length;
    if (share > 0.4) {
      const examplePosts = bottomN(
        bottomPosts.filter((p) => p[attr.field] === dominant),
        3,
        (p) => p.engagementRate
      ).map((p) => p.id);

      insights.push({
        id: `perf-under-${attr.field}-${dominant}`,
        category: "performance",
        priority: "high",
        type: "negative",
        title: `${attr.label(dominant)} is overrepresented in low performers`,
        description: `${Math.round(share * 100)}% of your bottom 25% posts use ${attr.label(dominant)} as their ${attr.kind}. These underperformers average just ${botAvg.toFixed(1)}% engagement \u2014 ${formatPct(pctDiff(botAvg, overallAvg))} vs your overall ${overallAvg.toFixed(1)}%.`,
        metric: formatPct(pctDiff(botAvg, overallAvg)),
        recommendation: `Reduce reliance on ${attr.label(dominant)} or pair it with higher-performing elements to improve results.`,
        relatedPosts: examplePosts,
        dataPoints: {
          bottomAvgER: botAvg,
          overallAvgER: overallAvg,
          dominantAttribute: attr.label(dominant),
          shareInBottom: Math.round(share * 100),
        },
      });
    }
  }

  if (insights.length === 0) {
    const examplePosts = bottomN(bottomPosts, 3, (p) => p.engagementRate).map((p) => p.id);
    insights.push({
      id: "perf-underperformers",
      category: "performance",
      priority: "high",
      type: "negative",
      title: "Bottom performers average only " + botAvg.toFixed(1) + "% engagement",
      description: `Your bottom 25% of posts average ${botAvg.toFixed(1)}% engagement, ${formatPct(pctDiff(botAvg, overallAvg))} below your overall average of ${overallAvg.toFixed(1)}%. Review these posts for common weaknesses.`,
      recommendation: "Audit low-performing posts for weak hooks, poor timing, or mismatched content types.",
      relatedPosts: examplePosts,
      dataPoints: { bottomAvgER: botAvg, overallAvgER: overallAvg },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// 3. generateEngagementTrendInsight
// ---------------------------------------------------------------------------

function generateEngagementTrendInsight(posts: PostRecord[]): Insight[] {
  const byWeek = groupBy(posts, (p) => weekKey(toDate(p.publishedAt)));
  if (byWeek.size < 3) return [];

  const weeks = [...byWeek.entries()]
    .map(([key, ps]) => ({ key, avgER: avg(ps.map((p) => p.engagementRate)) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const points = weeks.map((w, i) => ({ x: i, y: w.avgER }));
  const slope = trendSlope(points);

  if (Math.abs(slope) < 0.05) return [];

  const direction = slope > 0 ? "improving" : "declining";
  const firstWeekER = weeks[0].avgER;
  const lastWeekER = weeks[weeks.length - 1].avgER;
  const change = pctDiff(lastWeekER, firstWeekER);

  return [
    {
      id: `perf-engagement-trend-${direction}`,
      category: "performance",
      priority: "high",
      type: slope > 0 ? "positive" : "negative",
      title: `Engagement is ${direction} over ${weeks.length} weeks`,
      description: `Your average engagement rate moved from ${firstWeekER.toFixed(1)}% to ${lastWeekER.toFixed(1)}% over the last ${weeks.length} weeks (${formatPct(change)}).`,
      metric: formatPct(change),
      recommendation:
        slope > 0
          ? "Keep up the momentum \u2014 double down on recent content strategies."
          : "Investigate what changed in recent weeks. Review content mix, posting times, and hook quality.",
      dataPoints: {
        firstWeekER,
        lastWeekER,
        slope: parseFloat(slope.toFixed(4)),
        weekCount: weeks.length,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. generateSaveRateInsight
// ---------------------------------------------------------------------------

function generateSaveRateInsight(posts: PostRecord[]): Insight[] {
  const postsWithViews = posts.filter((p) => p.views > 0);
  if (postsWithViews.length < 5) return [];

  const withRate = postsWithViews.map((p) => ({
    ...p,
    saveRate: p.saves / p.views,
  }));

  const top5 = topN(withRate, 5, (p) => p.saveRate);
  const overallSaveRate = avg(withRate.map((p) => p.saveRate));

  // Find shared attributes
  const hookFreq = freqMap(top5.map((p) => p.hookType));
  const contentFreq = freqMap(top5.map((p) => p.contentType));

  let sharedAttr = "";
  if (hookFreq[0][1] >= 3) {
    sharedAttr = `Most use ${hookLabel(hookFreq[0][0])} hooks.`;
  } else if (contentFreq[0][1] >= 3) {
    sharedAttr = `Most are ${contentLabel(contentFreq[0][0])} content.`;
  }

  const topAvgSave = avg(top5.map((p) => p.saveRate));

  return [
    {
      id: "perf-save-rate",
      category: "performance",
      priority: "medium",
      type: "positive",
      title: "High-save posts average " + (topAvgSave * 100).toFixed(1) + "% save rate",
      description: `Your top 5 most-saved posts average a ${(topAvgSave * 100).toFixed(1)}% save rate \u2014 ${formatMultiplier(topAvgSave / (overallSaveRate || 1))} your overall average of ${(overallSaveRate * 100).toFixed(2)}%. ${sharedAttr}`.trim(),
      metric: formatMultiplier(topAvgSave / (overallSaveRate || 1)),
      recommendation: "Saves signal high-value content. Create more bookmark-worthy posts with actionable tips, templates, or reference material.",
      relatedPosts: top5.map((p) => p.id),
      dataPoints: { topAvgSaveRate: topAvgSave, overallSaveRate },
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. generateShareRateInsight
// ---------------------------------------------------------------------------

function generateShareRateInsight(posts: PostRecord[]): Insight[] {
  const postsWithViews = posts.filter((p) => p.views > 0);
  if (postsWithViews.length < 5) return [];

  const withRate = postsWithViews.map((p) => ({
    ...p,
    shareRate: p.shares / p.views,
  }));

  const top5 = topN(withRate, 5, (p) => p.shareRate);
  const overallShareRate = avg(withRate.map((p) => p.shareRate));
  const topAvgShare = avg(top5.map((p) => p.shareRate));

  const hookFreq = freqMap(top5.map((p) => p.hookType));
  let driver = "";
  if (hookFreq[0][1] >= 3) {
    driver = ` Posts with ${hookLabel(hookFreq[0][0])} hooks drive the most shares.`;
  }

  return [
    {
      id: "perf-share-rate",
      category: "performance",
      priority: "medium",
      type: "positive",
      title: "Most-shared posts achieve " + (topAvgShare * 100).toFixed(1) + "% share rate",
      description: `Your top 5 most-shared posts average a ${(topAvgShare * 100).toFixed(1)}% share rate \u2014 ${formatMultiplier(topAvgShare / (overallShareRate || 1))} your overall average of ${(overallShareRate * 100).toFixed(2)}%.${driver}`,
      metric: formatMultiplier(topAvgShare / (overallShareRate || 1)),
      recommendation: "Shares are the strongest virality signal. Lean into relatable, emotional, or highly useful content that people want to pass along.",
      relatedPosts: top5.map((p) => p.id),
      dataPoints: { topAvgShareRate: topAvgShare, overallShareRate },
    },
  ];
}

// ---------------------------------------------------------------------------
// 6. generateBestContentTypePerPlatform
// ---------------------------------------------------------------------------

function generateBestContentTypePerPlatform(posts: PostRecord[]): Insight[] {
  const byPlatform = groupBy(posts, (p) => p.platform);
  const insights: Insight[] = [];

  for (const [platform, platPosts] of byPlatform) {
    if (platPosts.length < 3) continue;

    const byType = groupBy(platPosts, (p) => p.contentType);
    const typeStats: { type: string; avgER: number; count: number }[] = [];

    for (const [ct, ctPosts] of byType) {
      if (ctPosts.length < 2) continue;
      typeStats.push({ type: ct, avgER: avg(ctPosts.map((p) => p.engagementRate)), count: ctPosts.length });
    }

    if (typeStats.length < 2) continue;

    typeStats.sort((a, b) => b.avgER - a.avgER);
    const best = typeStats[0];
    const second = typeStats[1];
    const diff = pctDiff(best.avgER, second.avgER);

    if (diff < 50) continue;

    const examplePosts = topN(
      platPosts.filter((p) => p.contentType === best.type),
      3,
      (p) => p.engagementRate
    ).map((p) => p.id);

    insights.push({
      id: `content-best-type-${platform}-${best.type}`,
      category: "content",
      priority: "high",
      type: "action",
      title: `${contentLabel(best.type)} crushes it on ${platformLabel(platform)}`,
      description: `${contentLabel(best.type)} posts on ${platformLabel(platform)} average ${best.avgER.toFixed(1)}% engagement \u2014 ${formatPct(diff)} better than ${contentLabel(second.type)} (${second.avgER.toFixed(1)}%). Based on ${best.count} posts.`,
      metric: formatPct(diff),
      recommendation: `Prioritise ${contentLabel(best.type)} content on ${platformLabel(platform)} for maximum engagement.`,
      relatedPosts: examplePosts,
      dataPoints: { bestType: best.type, bestER: best.avgER, secondType: second.type, secondER: second.avgER },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// 7. generateCaptionLengthInsight
// ---------------------------------------------------------------------------

function generateCaptionLengthInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  function bucket(len: number): string {
    if (len < 50) return "short";
    if (len < 150) return "medium";
    if (len < 300) return "long";
    return "very long";
  }

  const bucketLabels: Record<string, string> = {
    short: "Short (<50 chars)",
    medium: "Medium (50-150 chars)",
    long: "Long (150-300 chars)",
    "very long": "Very long (300+ chars)",
  };

  const byBucket = groupBy(posts, (p) => bucket(p.caption.length));
  const stats: { bucket: string; avgER: number; count: number }[] = [];

  for (const [b, bPosts] of byBucket) {
    if (bPosts.length < 3) continue;
    stats.push({ bucket: b, avgER: avg(bPosts.map((p) => p.engagementRate)), count: bPosts.length });
  }

  if (stats.length < 2) return [];

  stats.sort((a, b) => b.avgER - a.avgER);
  const best = stats[0];
  const worst = stats[stats.length - 1];
  const overallAvg = avg(posts.map((p) => p.engagementRate));

  return [
    {
      id: "content-caption-length",
      category: "content",
      priority: "medium",
      type: best.avgER > overallAvg ? "positive" : "neutral",
      title: `${bucketLabels[best.bucket]} captions perform best`,
      description: `${bucketLabels[best.bucket]} captions average ${best.avgER.toFixed(1)}% engagement (${best.count} posts), while ${bucketLabels[worst.bucket]} captions average just ${worst.avgER.toFixed(1)}% (${worst.count} posts).`,
      metric: formatPct(pctDiff(best.avgER, worst.avgER)),
      recommendation: `Aim for ${best.bucket} captions (${bucketLabels[best.bucket].toLowerCase()}) to maximise engagement.`,
      dataPoints: Object.fromEntries(stats.map((s) => [s.bucket, s.avgER])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 8. generateHashtagEffectivenessInsight
// ---------------------------------------------------------------------------

function generateHashtagEffectivenessInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  // Build hashtag -> posts map
  const hashtagPosts = new Map<string, PostRecord[]>();
  for (const p of posts) {
    for (const tag of p.hashtags) {
      const lower = tag.toLowerCase();
      const arr = hashtagPosts.get(lower) ?? [];
      arr.push(p);
      hashtagPosts.set(lower, arr);
    }
  }

  const overallAvg = avg(posts.map((p) => p.engagementRate));

  const qualified: { tag: string; avgER: number; count: number }[] = [];
  for (const [tag, tPosts] of hashtagPosts) {
    if (tPosts.length < 3) continue;
    qualified.push({ tag, avgER: avg(tPosts.map((p) => p.engagementRate)), count: tPosts.length });
  }

  if (qualified.length < 3) return [];

  qualified.sort((a, b) => b.avgER - a.avgER);
  const bestTags = qualified.slice(0, 3);
  const worstTags = qualified.slice(-3).reverse();

  const insights: Insight[] = [];

  // Positive insight
  const bestDesc = bestTags
    .map((t) => `#${t.tag} (${t.avgER.toFixed(1)}%, ${formatPct(pctDiff(t.avgER, overallAvg))} vs avg)`)
    .join(", ");
  insights.push({
    id: "content-hashtag-best",
    category: "content",
    priority: "medium",
    type: "positive",
    title: "Top-performing hashtags identified",
    description: `These hashtags consistently outperform your ${overallAvg.toFixed(1)}% average: ${bestDesc}.`,
    metric: formatPct(pctDiff(bestTags[0].avgER, overallAvg)),
    recommendation: `Use ${bestTags.map((t) => "#" + t.tag).join(", ")} more frequently in your posts.`,
    dataPoints: Object.fromEntries(bestTags.map((t) => [t.tag, t.avgER])),
  });

  // Negative insight
  const worstDesc = worstTags
    .map((t) => `#${t.tag} (${t.avgER.toFixed(1)}%, ${formatPct(pctDiff(t.avgER, overallAvg))} vs avg)`)
    .join(", ");
  insights.push({
    id: "content-hashtag-worst",
    category: "content",
    priority: "medium",
    type: "negative",
    title: "Underperforming hashtags dragging down reach",
    description: `These hashtags consistently underperform your ${overallAvg.toFixed(1)}% average: ${worstDesc}.`,
    metric: formatPct(pctDiff(worstTags[0].avgER, overallAvg)),
    recommendation: `Avoid or replace ${worstTags.map((t) => "#" + t.tag).join(", ")} \u2014 they correlate with lower engagement.`,
    dataPoints: Object.fromEntries(worstTags.map((t) => [t.tag, t.avgER])),
  });

  return insights;
}

// ---------------------------------------------------------------------------
// 9. generateHashtagCountInsight
// ---------------------------------------------------------------------------

function generateHashtagCountInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  function bucket(count: number): string {
    if (count === 0) return "0";
    if (count <= 3) return "1-3";
    if (count <= 7) return "4-7";
    return "8+";
  }

  const bucketLabels: Record<string, string> = {
    "0": "No hashtags",
    "1-3": "1-3 hashtags",
    "4-7": "4-7 hashtags",
    "8+": "8+ hashtags",
  };

  const byBucket = groupBy(posts, (p) => bucket(p.hashtags.length));
  const stats: { bucket: string; avgER: number; count: number }[] = [];

  for (const [b, bPosts] of byBucket) {
    if (bPosts.length < 3) continue;
    stats.push({ bucket: b, avgER: avg(bPosts.map((p) => p.engagementRate)), count: bPosts.length });
  }

  if (stats.length < 2) return [];

  stats.sort((a, b) => b.avgER - a.avgER);
  const best = stats[0];
  const worst = stats[stats.length - 1];

  return [
    {
      id: "content-hashtag-count",
      category: "content",
      priority: "low",
      type: "neutral",
      title: `${bucketLabels[best.bucket]} is the sweet spot for hashtags`,
      description: `Posts with ${bucketLabels[best.bucket].toLowerCase()} average ${best.avgER.toFixed(1)}% engagement (${best.count} posts). Posts with ${bucketLabels[worst.bucket].toLowerCase()} average only ${worst.avgER.toFixed(1)}% (${worst.count} posts).`,
      metric: formatPct(pctDiff(best.avgER, worst.avgER)),
      recommendation: `Stick to ${bucketLabels[best.bucket].toLowerCase()} per post for optimal engagement.`,
      dataPoints: Object.fromEntries(stats.map((s) => [s.bucket, s.avgER])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 10. generateContentHookComboInsight
// ---------------------------------------------------------------------------

function generateContentHookComboInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const byCombo = groupBy(posts, (p) => `${p.contentType}|${p.hookType}`);
  const combos: { ct: string; ht: string; avgER: number; count: number }[] = [];

  for (const [key, cPosts] of byCombo) {
    if (cPosts.length < 3) continue;
    const [ct, ht] = key.split("|");
    combos.push({ ct, ht, avgER: avg(cPosts.map((p) => p.engagementRate)), count: cPosts.length });
  }

  if (combos.length < 2) return [];

  combos.sort((a, b) => b.avgER - a.avgER);
  const best = combos[0];
  const overallAvg = avg(posts.map((p) => p.engagementRate));
  const diff = pctDiff(best.avgER, overallAvg);

  const examplePosts = topN(
    posts.filter((p) => p.contentType === best.ct && p.hookType === best.ht),
    3,
    (p) => p.engagementRate
  ).map((p) => p.id);

  return [
    {
      id: `content-combo-${best.ct}-${best.ht}`,
      category: "content",
      priority: "medium",
      type: "action",
      title: `${contentLabel(best.ct)} + ${hookLabel(best.ht)} is your winning combo`,
      description: `${contentLabel(best.ct)} posts with ${hookLabel(best.ht)} hooks average ${best.avgER.toFixed(1)}% engagement \u2014 ${formatPct(diff)} above your overall ${overallAvg.toFixed(1)}%. Based on ${best.count} posts.`,
      metric: formatPct(diff),
      recommendation: `Create more ${contentLabel(best.ct)} content with ${hookLabel(best.ht)} hooks to replicate this success.`,
      relatedPosts: examplePosts,
      dataPoints: { comboER: best.avgER, overallER: overallAvg, comboCount: best.count },
    },
  ];
}

// ---------------------------------------------------------------------------
// 11. generateBestPostingTimesInsight
// ---------------------------------------------------------------------------

function generateBestPostingTimesInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const withTime = posts.map((p) => {
    const d = toDate(p.publishedAt);
    return { ...p, day: d.getDay(), block: Math.floor(d.getHours() / 3) * 3 };
  });

  const bySlot = groupBy(withTime, (p) => `${p.day}-${p.block}`);
  const slotStats: { day: number; block: number; avgER: number; count: number; key: string }[] = [];

  for (const [key, sPosts] of bySlot) {
    if (sPosts.length < 2) continue;
    const [d, b] = key.split("-").map(Number);
    slotStats.push({ day: d, block: b, avgER: avg(sPosts.map((p) => p.engagementRate)), count: sPosts.length, key });
  }

  if (slotStats.length < 3) return [];

  slotStats.sort((a, b) => b.avgER - a.avgER);
  const top3 = slotStats.slice(0, 3);
  const overallAvg = avg(posts.map((p) => p.engagementRate));

  const slotDescs = top3
    .map((s) => `${dayName(s.day)} ${timeBlockLabel(s.block)} (${s.avgER.toFixed(1)}%, ${s.count} posts)`)
    .join("; ");

  return [
    {
      id: `timing-best-${top3.map((s) => `${s.day}-${s.block}`).join("-")}`,
      category: "timing",
      priority: "high",
      type: "action",
      title: "Best posting times identified",
      description: `Your top 3 time slots by engagement: ${slotDescs}. Overall average is ${overallAvg.toFixed(1)}%.`,
      metric: formatPct(pctDiff(top3[0].avgER, overallAvg)),
      recommendation: `Schedule posts during ${dayName(top3[0].day)} ${timeBlockLabel(top3[0].block)} for best results.`,
      dataPoints: Object.fromEntries(top3.map((s) => [`${dayName(s.day)}_${hourLabel(s.block)}`, s.avgER])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 12. generateWorstPostingTimesInsight
// ---------------------------------------------------------------------------

function generateWorstPostingTimesInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const withTime = posts.map((p) => {
    const d = toDate(p.publishedAt);
    return { ...p, day: d.getDay(), block: Math.floor(d.getHours() / 3) * 3 };
  });

  const bySlot = groupBy(withTime, (p) => `${p.day}-${p.block}`);
  const slotStats: { day: number; block: number; avgER: number; count: number }[] = [];

  for (const [key, sPosts] of bySlot) {
    if (sPosts.length < 2) continue;
    const [d, b] = key.split("-").map(Number);
    slotStats.push({ day: d, block: b, avgER: avg(sPosts.map((p) => p.engagementRate)), count: sPosts.length });
  }

  if (slotStats.length < 3) return [];

  slotStats.sort((a, b) => a.avgER - b.avgER);
  const bottom3 = slotStats.slice(0, 3);
  const overallAvg = avg(posts.map((p) => p.engagementRate));

  const slotDescs = bottom3
    .map((s) => `${dayName(s.day)} ${timeBlockLabel(s.block)} (${s.avgER.toFixed(1)}%, ${s.count} posts)`)
    .join("; ");

  return [
    {
      id: `timing-worst-${bottom3.map((s) => `${s.day}-${s.block}`).join("-")}`,
      category: "timing",
      priority: "medium",
      type: "negative",
      title: "Avoid these posting times",
      description: `Your worst 3 time slots: ${slotDescs}. These average ${formatPct(pctDiff(bottom3[0].avgER, overallAvg))} below your overall ${overallAvg.toFixed(1)}%.`,
      metric: formatPct(pctDiff(bottom3[0].avgER, overallAvg)),
      recommendation: `Avoid posting during ${dayName(bottom3[0].day)} ${timeBlockLabel(bottom3[0].block)} if possible.`,
      dataPoints: Object.fromEntries(bottom3.map((s) => [`${dayName(s.day)}_${hourLabel(s.block)}`, s.avgER])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 13. generatePostingFrequencyInsight
// ---------------------------------------------------------------------------

function generatePostingFrequencyInsight(posts: PostRecord[]): Insight[] {
  const byWeek = groupBy(posts, (p) => weekKey(toDate(p.publishedAt)));
  if (byWeek.size < 4) return [];

  const weeks = [...byWeek.entries()].map(([key, wPosts]) => ({
    key,
    count: wPosts.length,
    avgER: avg(wPosts.map((p) => p.engagementRate)),
  }));

  const medianCount = avg(weeks.map((w) => w.count));
  const highVolume = weeks.filter((w) => w.count > medianCount);
  const lowVolume = weeks.filter((w) => w.count <= medianCount);

  if (highVolume.length === 0 || lowVolume.length === 0) return [];

  const highAvgER = avg(highVolume.map((w) => w.avgER));
  const lowAvgER = avg(lowVolume.map((w) => w.avgER));
  const avgPostsPerWeek = avg(weeks.map((w) => w.count));

  const diff = pctDiff(highAvgER, lowAvgER);

  return [
    {
      id: "timing-posting-frequency",
      category: "timing",
      priority: "medium",
      type: diff > 0 ? "positive" : "neutral",
      title: `You post ~${avgPostsPerWeek.toFixed(0)} times/week on average`,
      description: `High-volume weeks (${avg(highVolume.map((w) => w.count)).toFixed(0)}+ posts) average ${highAvgER.toFixed(1)}% per-post engagement, while low-volume weeks average ${lowAvgER.toFixed(1)}% (${formatPct(diff)} difference).`,
      metric: formatPct(diff),
      recommendation:
        diff > 0
          ? "Posting more frequently appears to help your engagement. Try maintaining higher consistency."
          : "Posting less frequently does not hurt per-post engagement. Focus on quality over quantity.",
      dataPoints: { avgPostsPerWeek, highVolumeER: highAvgER, lowVolumeER: lowAvgER },
    },
  ];
}

// ---------------------------------------------------------------------------
// 14. generateHookTypeRankingInsight
// ---------------------------------------------------------------------------

function generateHookTypeRankingInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const byHook = groupBy(posts, (p) => p.hookType);
  const stats: { hook: string; avgER: number; count: number }[] = [];

  for (const [hook, hPosts] of byHook) {
    if (hPosts.length < 3) continue;
    stats.push({ hook, avgER: avg(hPosts.map((p) => p.engagementRate)), count: hPosts.length });
  }

  if (stats.length < 2) return [];

  stats.sort((a, b) => b.avgER - a.avgER);
  const best = stats[0];
  const worst = stats[stats.length - 1];
  const overallAvg = avg(posts.map((p) => p.engagementRate));

  const examplePosts = topN(
    posts.filter((p) => p.hookType === best.hook),
    3,
    (p) => p.engagementRate
  ).map((p) => p.id);

  return [
    {
      id: `hooks-ranking-best-${best.hook}`,
      category: "hooks",
      priority: "high",
      type: "positive",
      title: `${hookLabel(best.hook)} hooks outperform all others`,
      description: `${hookLabel(best.hook)} hooks average ${best.avgER.toFixed(1)}% engagement \u2014 ${formatPct(pctDiff(best.avgER, overallAvg))} above your overall average of ${overallAvg.toFixed(1)}%. ${hookLabel(worst.hook)} hooks perform worst at ${worst.avgER.toFixed(1)}%.`,
      metric: formatPct(pctDiff(best.avgER, overallAvg)),
      recommendation: `Use ${hookLabel(best.hook)} hooks more often. Consider reducing ${hookLabel(worst.hook)} hooks.`,
      relatedPosts: examplePosts,
      dataPoints: Object.fromEntries(stats.map((s) => [hookLabel(s.hook), s.avgER])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 15. generatePlatformHookRecommendation
// ---------------------------------------------------------------------------

function generatePlatformHookRecommendation(posts: PostRecord[]): Insight[] {
  const byPlatform = groupBy(posts, (p) => p.platform);
  const platformBest: { platform: string; hook: string; avgER: number }[] = [];

  for (const [platform, pPosts] of byPlatform) {
    if (pPosts.length < 5) continue;

    const byHook = groupBy(pPosts, (p) => p.hookType);
    let bestHook = "";
    let bestER = -1;

    for (const [hook, hPosts] of byHook) {
      if (hPosts.length < 2) continue;
      const er = avg(hPosts.map((p) => p.engagementRate));
      if (er > bestER) {
        bestER = er;
        bestHook = hook;
      }
    }

    if (bestHook) {
      platformBest.push({ platform, hook: bestHook, avgER: bestER });
    }
  }

  if (platformBest.length < 2) return [];

  // Check if recommendations differ across platforms
  const uniqueHooks = new Set(platformBest.map((pb) => pb.hook));
  if (uniqueHooks.size < 2) return [];

  const details = platformBest
    .map((pb) => `${platformLabel(pb.platform)}: ${hookLabel(pb.hook)} (${pb.avgER.toFixed(1)}%)`)
    .join("; ");

  return [
    {
      id: "hooks-platform-recommendation",
      category: "hooks",
      priority: "medium",
      type: "action",
      title: "Different platforms respond to different hooks",
      description: `Best hook type per platform: ${details}. Tailor your opening hooks to each platform for maximum impact.`,
      recommendation: platformBest
        .map((pb) => `Use ${hookLabel(pb.hook)} hooks on ${platformLabel(pb.platform)}`)
        .join(". ") + ".",
      dataPoints: Object.fromEntries(platformBest.map((pb) => [platformLabel(pb.platform), hookLabel(pb.hook)])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 16. generateHookTrendInsight
// ---------------------------------------------------------------------------

function generateHookTrendInsight(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const d60 = new Date(now.getTime() - 60 * 86_400_000);

  const recent = posts.filter((p) => toDate(p.publishedAt) >= d30);
  const prior = posts.filter((p) => {
    const dt = toDate(p.publishedAt);
    return dt >= d60 && dt < d30;
  });

  if (recent.length < 5 || prior.length < 5) return [];

  // Get top hooks by volume across both periods
  const allHooks = freqMap(posts.map((p) => p.hookType));
  const topHooks = allHooks.filter(([, count]) => count >= 5).slice(0, 5);

  const insights: Insight[] = [];

  for (const [hook] of topHooks) {
    const recentPosts = recent.filter((p) => p.hookType === hook);
    const priorPosts = prior.filter((p) => p.hookType === hook);
    if (recentPosts.length < 2 || priorPosts.length < 2) continue;

    const recentER = avg(recentPosts.map((p) => p.engagementRate));
    const priorER = avg(priorPosts.map((p) => p.engagementRate));
    const change = pctDiff(recentER, priorER);

    if (Math.abs(change) < 20) continue;

    const direction = change > 0 ? "surging" : "declining";

    insights.push({
      id: `hooks-trend-${hook}-${direction}`,
      category: "hooks",
      priority: "medium",
      type: change > 0 ? "positive" : "negative",
      title: `${hookLabel(hook)} hooks are ${direction}`,
      description: `${hookLabel(hook)} hooks averaged ${recentER.toFixed(1)}% engagement in the last 30 days vs ${priorER.toFixed(1)}% in the prior 30 days (${formatPct(change)}).`,
      metric: formatPct(change),
      recommendation:
        change > 0
          ? `${hookLabel(hook)} hooks are trending up \u2014 use them more.`
          : `${hookLabel(hook)} hooks are losing effectiveness. Test new approaches.`,
      dataPoints: { recentER, priorER, change },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// 17. generateActionableRecommendations
// ---------------------------------------------------------------------------

function generateActionableRecommendations(posts: PostRecord[]): Insight[] {
  if (posts.length < 10) return [];

  const overallAvg = avg(posts.map((p) => p.engagementRate));
  const actions: { strength: number; text: string; id: string }[] = [];

  // Best content type per platform
  const byPlatform = groupBy(posts, (p) => p.platform);
  for (const [platform, pPosts] of byPlatform) {
    if (pPosts.length < 5) continue;
    const byType = groupBy(pPosts, (p) => p.contentType);
    let bestType = "";
    let bestER = 0;
    for (const [ct, ctPosts] of byType) {
      if (ctPosts.length < 3) continue;
      const er = avg(ctPosts.map((p) => p.engagementRate));
      if (er > bestER) {
        bestER = er;
        bestType = ct;
      }
    }
    if (bestType && bestER > overallAvg * 1.2) {
      const diff = pctDiff(bestER, overallAvg);
      actions.push({
        strength: diff,
        text: `Post more ${contentLabel(bestType).toLowerCase()} content on ${platformLabel(platform)} \u2014 it outperforms by ${formatPct(diff)}.`,
        id: `action-${platform}-${bestType}`,
      });
    }
  }

  // Best hook type
  const byHook = groupBy(posts, (p) => p.hookType);
  let bestHook = "";
  let bestHookER = 0;
  for (const [hook, hPosts] of byHook) {
    if (hPosts.length < 3) continue;
    const er = avg(hPosts.map((p) => p.engagementRate));
    if (er > bestHookER) {
      bestHookER = er;
      bestHook = hook;
    }
  }
  if (bestHook && bestHookER > overallAvg * 1.1) {
    const diff = pctDiff(bestHookER, overallAvg);
    actions.push({
      strength: diff,
      text: `Use ${hookLabel(bestHook)} hooks \u2014 they outperform by ${formatPct(diff)}.`,
      id: `action-hook-${bestHook}`,
    });
  }

  // Best posting time
  const withTime = posts.map((p) => {
    const d = toDate(p.publishedAt);
    return { ...p, day: d.getDay(), block: Math.floor(d.getHours() / 3) * 3 };
  });
  const bySlot = groupBy(withTime, (p) => `${p.day}-${p.block}`);
  let bestSlot = { day: 0, block: 0, avgER: 0 };
  for (const [key, sPosts] of bySlot) {
    if (sPosts.length < 2) continue;
    const [d, b] = key.split("-").map(Number);
    const er = avg(sPosts.map((p) => p.engagementRate));
    if (er > bestSlot.avgER) bestSlot = { day: d, block: b, avgER: er };
  }
  if (bestSlot.avgER > overallAvg * 1.15) {
    const diff = pctDiff(bestSlot.avgER, overallAvg);
    actions.push({
      strength: diff,
      text: `Schedule posts on ${dayName(bestSlot.day)} ${timeBlockLabel(bestSlot.block)} \u2014 ${formatPct(diff)} better than average.`,
      id: `action-timing-${bestSlot.day}-${bestSlot.block}`,
    });
  }

  // Caption length
  const captionBuckets = groupBy(posts, (p) => {
    const len = p.caption.length;
    if (len < 50) return "short";
    if (len < 150) return "medium";
    if (len < 300) return "long";
    return "very long";
  });
  let bestBucket = "";
  let bestBucketER = 0;
  for (const [b, bPosts] of captionBuckets) {
    if (bPosts.length < 3) continue;
    const er = avg(bPosts.map((p) => p.engagementRate));
    if (er > bestBucketER) {
      bestBucketER = er;
      bestBucket = b;
    }
  }
  if (bestBucket && bestBucketER > overallAvg * 1.1) {
    const diff = pctDiff(bestBucketER, overallAvg);
    actions.push({
      strength: diff,
      text: `Write ${bestBucket} captions \u2014 they get ${formatPct(diff)} more engagement.`,
      id: `action-caption-${bestBucket}`,
    });
  }

  // Save-worthy content
  const postsWithViews = posts.filter((p) => p.views > 0);
  if (postsWithViews.length >= 5) {
    const topSaved = topN(postsWithViews, 5, (p) => p.saves / p.views);
    const hookFreq = freqMap(topSaved.map((p) => p.hookType));
    if (hookFreq[0][1] >= 3) {
      actions.push({
        strength: 20,
        text: `Use ${hookLabel(hookFreq[0][0])} hooks for bookmark-worthy content \u2014 your most-saved posts favour them.`,
        id: `action-save-hook-${hookFreq[0][0]}`,
      });
    }
  }

  if (actions.length === 0) return [];

  // Sort by strength, take top 5
  actions.sort((a, b) => b.strength - a.strength);
  const top = actions.slice(0, 5);

  return [
    {
      id: "actions-recommendations",
      category: "growth",
      priority: "high",
      type: "action",
      title: `${top.length} actionable recommendations for your content`,
      description: top.map((a, i) => `${i + 1}. ${a.text}`).join(" "),
      recommendation: top.map((a) => a.text).join("\n"),
      dataPoints: Object.fromEntries(top.map((a, i) => [`action_${i + 1}`, a.text])),
    },
  ];
}

// ---------------------------------------------------------------------------
// 18. generatePlatformHealthInsight
// ---------------------------------------------------------------------------

function generatePlatformHealthInsight(posts: PostRecord[]): Insight[] {
  const now = new Date();
  const d14 = new Date(now.getTime() - 14 * 86_400_000);
  const d28 = new Date(now.getTime() - 28 * 86_400_000);

  const recent = posts.filter((p) => toDate(p.publishedAt) >= d14);
  const prior = posts.filter((p) => {
    const dt = toDate(p.publishedAt);
    return dt >= d28 && dt < d14;
  });

  if (recent.length < 3 || prior.length < 3) return [];

  const byPlatformRecent = groupBy(recent, (p) => p.platform);
  const byPlatformPrior = groupBy(prior, (p) => p.platform);

  const insights: Insight[] = [];

  for (const [platform, rPosts] of byPlatformRecent) {
    const pPosts = byPlatformPrior.get(platform);
    if (!pPosts || rPosts.length < 2 || pPosts.length < 2) continue;

    const recentER = avg(rPosts.map((p) => p.engagementRate));
    const priorER = avg(pPosts.map((p) => p.engagementRate));
    const change = pctDiff(recentER, priorER);

    if (change >= -15) continue; // Only flag significant declines

    insights.push({
      id: `health-${platform}-decline`,
      category: "growth",
      priority: "high",
      type: "negative",
      title: `${platformLabel(platform)} engagement is dropping`,
      description: `${platformLabel(platform)} engagement fell from ${priorER.toFixed(1)}% to ${recentER.toFixed(1)}% over the last 2 weeks (${formatPct(change)}). Based on ${rPosts.length} recent vs ${pPosts.length} prior posts.`,
      metric: formatPct(change),
      recommendation: `Investigate ${platformLabel(platform)} performance. Check if content mix, posting times, or algorithm changes are affecting reach.`,
      dataPoints: {
        recentER,
        priorER,
        change,
        recentCount: rPosts.length,
        priorCount: pPosts.length,
      },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Priority & type sort order
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const TYPE_ORDER: Record<string, number> = { action: 0, negative: 1, positive: 2, neutral: 3 };

function sortInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    if (pDiff !== 0) return pDiff;
    return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
  });
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function generateInsights(posts: PostRecord[]): InsightsResponse {
  if (posts.length === 0) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      postCount: 0,
      dateRange: null,
    };
  }

  // Compute date range
  const dates = posts.map((p) => toDate(p.publishedAt).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Call all 18 generators
  const allInsights: Insight[] = [
    ...generateTopPerformersInsight(posts),
    ...generateUnderperformersInsight(posts),
    ...generateEngagementTrendInsight(posts),
    ...generateSaveRateInsight(posts),
    ...generateShareRateInsight(posts),
    ...generateBestContentTypePerPlatform(posts),
    ...generateCaptionLengthInsight(posts),
    ...generateHashtagEffectivenessInsight(posts),
    ...generateHashtagCountInsight(posts),
    ...generateContentHookComboInsight(posts),
    ...generateBestPostingTimesInsight(posts),
    ...generateWorstPostingTimesInsight(posts),
    ...generatePostingFrequencyInsight(posts),
    ...generateHookTypeRankingInsight(posts),
    ...generatePlatformHookRecommendation(posts),
    ...generateHookTrendInsight(posts),
    ...generateActionableRecommendations(posts),
    ...generatePlatformHealthInsight(posts),
  ];

  return {
    insights: sortInsights(allInsights),
    generatedAt: new Date().toISOString(),
    postCount: posts.length,
    dateRange: {
      from: minDate.toISOString(),
      to: maxDate.toISOString(),
    },
  };
}
