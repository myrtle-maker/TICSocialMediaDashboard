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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    const a = avg(group.map((g) => g.engagementRate));
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

  // Per-platform stats
  const platformGroups = groupBy(posts, (p) => p.platform);
  const platformStats: PlatformStats[] = [];
  for (const [plat, group] of platformGroups) {
    const label =
      PLATFORM_CONFIG[plat as Platform]?.label ?? plat;
    platformStats.push({
      platform: plat,
      label,
      postCount: group.length,
      avgEngagementRate: avg(group.map((p) => p.engagementRate)),
      avgViews: avg(group.map((p) => p.views)),
      bestContentType: bestByAvgER(group, (p) => p.contentType),
      bestHookType: bestByAvgER(group, (p) => p.hookType),
    });
  }

  // Top 5 and bottom 5 by ER
  const topPosts = topN(posts, 5, (p) => p.engagementRate).map(toPostSummary);
  const bottomPosts = bottomN(posts, 5, (p) => p.engagementRate).map(toPostSummary);

  // Overall trend: compare avg ER of first half vs second half of posts (by date)
  let overallTrend: "improving" | "declining" | "stable" = "stable";
  if (posts.length >= 10) {
    const sorted = [...posts].sort(
      (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime()
    );
    const points = sorted.map((p, i) => ({
      x: i,
      y: p.engagementRate,
    }));
    const slope = trendSlope(points);
    if (slope > 0.001) overallTrend = "improving";
    else if (slope < -0.001) overallTrend = "declining";
  }

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
  };
}
