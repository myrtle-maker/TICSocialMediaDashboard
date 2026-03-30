import { prisma } from "@/lib/prisma";
import { generateInsights } from "./insights";
import {
  avg,
  groupBy,
  topN,
  bottomN,
  trendSlope,
} from "./insights-helpers";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformStats {
  platform: string;
  label: string;
  postCount: number;
  avgEngagementRate: number;
  avgViews: number;
  bestContentType: string | null;
  bestHookType: string | null;
}

export interface PostSummary {
  id: string;
  platform: string;
  contentType: string;
  hookType: string;
  hookText: string;
  caption: string;
  engagementRate: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishedAt: string;
}

export interface HashtagStat {
  hashtag: string;
  postCount: number;
  avgEngagementRate: number;
  totalViews: number;
}

export interface HookTypeRank {
  hookType: string;
  postCount: number;
  avgEngagementRate: number;
}

export interface PostingTimeStat {
  label: string;
  avgEngagementRate: number;
}

export interface ContentTypeStat {
  contentType: string;
  postCount: number;
  avgEngagementRate: number;
  avgViews: number;
}

export interface AnalyticsContext {
  summary: {
    postCount: number;
    dateFrom: string;
    dateTo: string;
    platforms: string[];
    accountCount: number;
  };
  topInsights: {
    title: string;
    description: string;
    category: string;
    priority: string;
    type: string;
    recommendation?: string;
  }[];
  platformStats: PlatformStats[];
  topPosts: PostSummary[];
  bottomPosts: PostSummary[];
  overallTrend: "improving" | "declining" | "stable";
  topHashtags: HashtagStat[];
  hookTypeRankings: HookTypeRank[];
  bestPostingDays: PostingTimeStat[];
  bestPostingHours: PostingTimeStat[];
  contentTypeStats: ContentTypeStat[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toPostSummary(p: {
  id: string;
  platform: string;
  contentType: string;
  hookType: string;
  hookText: string;
  caption: string;
  engagementRate: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishedAt: Date;
}): PostSummary {
  return {
    id: p.id,
    platform: p.platform,
    contentType: p.contentType,
    hookType: p.hookType,
    hookText: p.hookText,
    caption: p.caption.length > 200 ? p.caption.slice(0, 200) + "..." : p.caption,
    engagementRate: p.engagementRate,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    publishedAt: p.publishedAt.toISOString(),
  };
}

function bestByAvgER<T extends { engagementRate: number }>(
  items: T[],
  key: (item: T) => string
): string | null {
  const groups = groupBy(items, key);
  let best: string | null = null;
  let bestAvg = -1;
  for (const [k, group] of groups) {
    if (group.length < 2) continue;
    const ratedGroup = group.filter((g) => g.engagementRate > 0);
    if (ratedGroup.length === 0) continue;
    const a = avg(ratedGroup.map((g) => g.engagementRate));
    if (a > bestAvg) {
      bestAvg = a;
      best = k;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function getAnalyticsContext(): Promise<AnalyticsContext> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [posts, accounts] = await Promise.all([
    prisma.post.findMany({
      where: { publishedAt: { gte: ninetyDaysAgo } },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.account.findMany(),
  ]);

  // Generate algorithmic insights
  const insightsResult = generateInsights(posts as never[]);

  // Date range
  const dates = posts.map((p) => p.publishedAt.getTime());
  const dateFrom = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : "";
  const dateTo = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : "";

  // Platforms present
  const platforms = [...new Set(posts.map((p) => p.platform))];

  // Top 10 insights sorted by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const topInsights = insightsResult.insights
    .sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
    )
    .slice(0, 10)
    .map((i) => ({
      title: i.title,
      description: i.description,
      category: i.category,
      priority: i.priority,
      type: i.type,
      recommendation: i.recommendation,
    }));

  // Per-platform stats — exclude zero-rate posts from averages
  const platformGroups = groupBy(posts, (p) => p.platform);
  const platformStats: PlatformStats[] = [];
  for (const [plat, group] of platformGroups) {
    const label = PLATFORM_CONFIG[plat as Platform]?.label ?? plat;
    const ratedGroup = group.filter((p) => p.engagementRate > 0);
    platformStats.push({
      platform: plat,
      label,
      postCount: group.length,
      avgEngagementRate: ratedGroup.length > 0 ? avg(ratedGroup.map((p) => p.engagementRate)) : 0,
      avgViews: avg(group.map((p) => p.views)),
      bestContentType: bestByAvgER(group, (p) => p.contentType),
      bestHookType: bestByAvgER(group, (p) => p.hookType),
    });
  }

  // Top 10 and bottom 10 by ER (exclude zero-rate from bottom)
  const postsWithRate = posts.filter((p) => p.engagementRate > 0);
  const topPosts = topN(postsWithRate, 10, (p) => p.engagementRate).map(toPostSummary);
  const bottomPosts = bottomN(postsWithRate, 10, (p) => p.engagementRate).map(toPostSummary);

  // Overall trend: compare avg ER of first half vs second half of posts (by date)
  let overallTrend: "improving" | "declining" | "stable" = "stable";
  if (postsWithRate.length >= 10) {
    const sorted = [...postsWithRate].sort(
      (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime()
    );
    const points = sorted.map((p, i) => ({ x: i, y: p.engagementRate }));
    const slope = trendSlope(points);
    if (slope > 0.001) overallTrend = "improving";
    else if (slope < -0.001) overallTrend = "declining";
  }

  // Top hashtags by avg engagement rate (min 2 posts)
  const hashtagMap = new Map<string, { count: number; totalRate: number; totalViews: number }>();
  for (const post of posts) {
    for (const tag of post.hashtags) {
      const existing = hashtagMap.get(tag) ?? { count: 0, totalRate: 0, totalViews: 0 };
      existing.count += 1;
      existing.totalRate += post.engagementRate;
      existing.totalViews += post.views;
      hashtagMap.set(tag, existing);
    }
  }
  const topHashtags: HashtagStat[] = Array.from(hashtagMap.entries())
    .filter(([, d]) => d.count >= 2)
    .map(([hashtag, d]) => ({
      hashtag,
      postCount: d.count,
      avgEngagementRate: d.totalRate / d.count,
      totalViews: d.totalViews,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 10);

  // Hook type rankings by avg engagement rate
  const hookGroups = groupBy(postsWithRate, (p) => p.hookType);
  const hookTypeRankings: HookTypeRank[] = Array.from(hookGroups.entries())
    .filter(([, group]) => group.length >= 2)
    .map(([hookType, group]) => ({
      hookType,
      postCount: group.length,
      avgEngagementRate: avg(group.map((p) => p.engagementRate)),
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  // Best posting days and hours (UTC)
  const dayMap = new Map<number, { totalRate: number; count: number }>();
  const hourMap = new Map<number, { totalRate: number; count: number }>();
  for (const post of postsWithRate) {
    const d = new Date(post.publishedAt);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const dayEntry = dayMap.get(day) ?? { totalRate: 0, count: 0 };
    dayEntry.totalRate += post.engagementRate;
    dayEntry.count += 1;
    dayMap.set(day, dayEntry);
    const hourEntry = hourMap.get(hour) ?? { totalRate: 0, count: 0 };
    hourEntry.totalRate += post.engagementRate;
    hourEntry.count += 1;
    hourMap.set(hour, hourEntry);
  }
  const bestPostingDays: PostingTimeStat[] = Array.from(dayMap.entries())
    .filter(([, d]) => d.count >= 2)
    .map(([day, d]) => ({ label: DAY_NAMES[day], avgEngagementRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 3);
  const bestPostingHours: PostingTimeStat[] = Array.from(hourMap.entries())
    .filter(([, d]) => d.count >= 2)
    .map(([hour, d]) => ({ label: `${hour}:00 UTC`, avgEngagementRate: d.totalRate / d.count }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 3);

  // Content type stats
  const contentTypeGroups = groupBy(posts, (p) => p.contentType);
  const contentTypeStats: ContentTypeStat[] = Array.from(contentTypeGroups.entries())
    .map(([contentType, group]) => {
      const rated = group.filter((p) => p.engagementRate > 0);
      return {
        contentType,
        postCount: group.length,
        avgEngagementRate: rated.length > 0 ? avg(rated.map((p) => p.engagementRate)) : 0,
        avgViews: avg(group.map((p) => p.views)),
      };
    })
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  return {
    summary: {
      postCount: posts.length,
      dateFrom,
      dateTo,
      platforms,
      accountCount: accounts.length,
    },
    topInsights,
    platformStats,
    topPosts,
    bottomPosts,
    overallTrend,
    topHashtags,
    hookTypeRankings,
    bestPostingDays,
    bestPostingHours,
    contentTypeStats,
  };
}
