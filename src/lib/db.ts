/**
 * In-memory data store backed by seed data.
 *
 * Every function respects PostFilters so the dashboard can filter, sort, and
 * aggregate consistently. When Prisma is wired up later, swap these
 * implementations for real DB queries.
 */

import { seedAccounts, seedPosts } from "@/lib/seed-data";
import type {
  SocialAccount,
  SocialPost,
  PostFilters,
  KpiData,
  HookAnalysis,
  ContentTypeAnalysis,
  TrendDataPoint,
  PostingTimeHeatmap,
  HashtagPerformance,
  HookType,
  ContentType,
} from "@/types/social";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyFilters(
  posts: SocialPost[],
  filters?: Partial<PostFilters>,
): SocialPost[] {
  if (!filters) return [...posts];

  let result = [...posts];

  // Platforms
  if (filters.platforms && filters.platforms.length > 0) {
    result = result.filter((p) => filters.platforms!.includes(p.platform));
  }

  // Content types
  if (filters.contentTypes && filters.contentTypes.length > 0) {
    result = result.filter((p) => filters.contentTypes!.includes(p.contentType));
  }

  // Accounts
  if (filters.accounts && filters.accounts.length > 0) {
    result = result.filter((p) => filters.accounts!.includes(p.accountId));
  }

  // Hook types
  if (filters.hookTypes && filters.hookTypes.length > 0) {
    result = result.filter((p) => filters.hookTypes!.includes(p.hookType));
  }

  // Date range
  if (filters.dateRange) {
    const from = new Date(filters.dateRange.from).getTime();
    const to = new Date(filters.dateRange.to).getTime();
    result = result.filter((p) => {
      const t = new Date(p.publishedAt).getTime();
      return t >= from && t <= to;
    });
  }

  // Min engagement rate
  if (filters.minEngagementRate != null) {
    result = result.filter((p) => p.engagementRate >= filters.minEngagementRate!);
  }

  // Min views
  if (filters.minViews != null) {
    result = result.filter((p) => p.views >= filters.minViews!);
  }

  // Hashtags
  if (filters.hashtags && filters.hashtags.length > 0) {
    const tags = filters.hashtags.map((h) => h.toLowerCase());
    result = result.filter((p) =>
      p.hashtags.some((h) => tags.includes(h)),
    );
  }

  // Search query
  if (filters.searchQuery && filters.searchQuery.trim() !== "") {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.caption.toLowerCase().includes(q) ||
        p.hookText.toLowerCase().includes(q),
    );
  }

  // Sort
  const sortBy = filters.sortBy ?? "publishedAt";
  const sortOrder = filters.sortOrder ?? "desc";
  result.sort((a, b) => {
    const aVal = sortValue(a, sortBy);
    const bVal = sortValue(b, sortBy);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  return result;
}

function sortValue(
  p: SocialPost,
  key: PostFilters["sortBy"],
): number {
  switch (key) {
    case "publishedAt":
      return new Date(p.publishedAt).getTime();
    case "engagementRate":
      return p.engagementRate;
    case "views":
      return p.views;
    case "likes":
      return p.likes;
    case "shares":
      return p.shares;
    case "saves":
      return p.saves;
    case "viralityScore":
      return p.viralityScore;
    case "hookScore":
      return p.hookScore;
    default:
      return new Date(p.publishedAt).getTime();
  }
}

function formatDateKey(d: Date): string {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAccounts(): SocialAccount[] {
  return [...seedAccounts];
}

export function getAccountById(id: string): SocialAccount | undefined {
  return seedAccounts.find((a) => a.id === id);
}

export function getPosts(filters?: Partial<PostFilters>): SocialPost[] {
  return applyFilters(seedPosts, filters);
}

export function getPostById(id: string): SocialPost | undefined {
  return seedPosts.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export function getKpis(filters?: Partial<PostFilters>): KpiData {
  const posts = applyFilters(seedPosts, filters);

  const totalEngagement = sum(
    posts.map((p) => p.likes + p.comments + p.shares + p.saves),
  );

  // Platform breakdown
  const platformMap = new Map<
    string,
    { posts: number; engagement: number; views: number }
  >();
  for (const p of posts) {
    const entry = platformMap.get(p.platform) ?? {
      posts: 0,
      engagement: 0,
      views: 0,
    };
    entry.posts += 1;
    entry.engagement += p.likes + p.comments + p.shares + p.saves;
    entry.views += p.views;
    platformMap.set(p.platform, entry);
  }

  const platformBreakdown = Array.from(platformMap.entries()).map(
    ([platform, data]) => ({
      platform: platform as SocialPost["platform"],
      ...data,
    }),
  );

  // Top post by engagement rate
  const topPost =
    posts.length > 0
      ? posts.reduce((best, p) =>
          p.engagementRate > best.engagementRate ? p : best,
        )
      : null;

  return {
    totalPosts: posts.length,
    totalEngagement,
    avgEngagementRate: avg(posts.map((p) => p.engagementRate)),
    totalViews: sum(posts.map((p) => p.views)),
    totalLikes: sum(posts.map((p) => p.likes)),
    totalShares: sum(posts.map((p) => p.shares)),
    totalSaves: sum(posts.map((p) => p.saves)),
    totalComments: sum(posts.map((p) => p.comments)),
    platformBreakdown,
    topPost,
  };
}

// ---------------------------------------------------------------------------
// Hook Analysis
// ---------------------------------------------------------------------------

export function getHookAnalysis(
  filters?: Partial<PostFilters>,
): HookAnalysis[] {
  const posts = applyFilters(seedPosts, filters);

  const groups = new Map<HookType, SocialPost[]>();
  for (const p of posts) {
    const arr = groups.get(p.hookType) ?? [];
    arr.push(p);
    groups.set(p.hookType, arr);
  }

  return Array.from(groups.entries())
    .map(([hookType, groupPosts]) => ({
      hookType,
      postCount: groupPosts.length,
      avgEngagementRate: avg(groupPosts.map((p) => p.engagementRate)),
      avgViews: avg(groupPosts.map((p) => p.views)),
      avgLikes: avg(groupPosts.map((p) => p.likes)),
      avgShares: avg(groupPosts.map((p) => p.shares)),
      topPosts: [...groupPosts]
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 3),
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
}

// ---------------------------------------------------------------------------
// Content Analysis
// ---------------------------------------------------------------------------

export function getContentAnalysis(
  filters?: Partial<PostFilters>,
): ContentTypeAnalysis[] {
  const posts = applyFilters(seedPosts, filters);

  const groups = new Map<ContentType, SocialPost[]>();
  for (const p of posts) {
    const arr = groups.get(p.contentType) ?? [];
    arr.push(p);
    groups.set(p.contentType, arr);
  }

  return Array.from(groups.entries())
    .map(([contentType, groupPosts]) => ({
      contentType,
      postCount: groupPosts.length,
      avgEngagementRate: avg(groupPosts.map((p) => p.engagementRate)),
      avgViews: avg(groupPosts.map((p) => p.views)),
      totalEngagement: sum(
        groupPosts.map((p) => p.likes + p.comments + p.shares + p.saves),
      ),
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement);
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export function getTrends(
  filters?: Partial<PostFilters>,
): TrendDataPoint[] {
  const posts = applyFilters(seedPosts, filters);

  const dayMap = new Map<
    string,
    { posts: number; engagement: number; views: number; rates: number[] }
  >();

  for (const p of posts) {
    const key = formatDateKey(p.publishedAt);
    const entry = dayMap.get(key) ?? {
      posts: 0,
      engagement: 0,
      views: 0,
      rates: [],
    };
    entry.posts += 1;
    entry.engagement += p.likes + p.comments + p.shares + p.saves;
    entry.views += p.views;
    entry.rates.push(p.engagementRate);
    dayMap.set(key, entry);
  }

  return Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      posts: data.posts,
      engagement: data.engagement,
      views: data.views,
      engagementRate: avg(data.rates),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Posting Heatmap
// ---------------------------------------------------------------------------

export function getPostingHeatmap(
  filters?: Partial<PostFilters>,
): PostingTimeHeatmap[] {
  const posts = applyFilters(seedPosts, filters);

  const cells = new Map<string, { rates: number[]; count: number }>();

  for (const p of posts) {
    const dt = new Date(p.publishedAt);
    const day = dt.getUTCDay(); // 0-6
    const hour = dt.getUTCHours(); // 0-23
    const key = `${day}-${hour}`;
    const entry = cells.get(key) ?? { rates: [], count: 0 };
    entry.rates.push(p.engagementRate);
    entry.count += 1;
    cells.set(key, entry);
  }

  return Array.from(cells.entries()).map(([key, data]) => {
    const [dayStr, hourStr] = key.split("-");
    return {
      day: Number(dayStr),
      hour: Number(hourStr),
      avgEngagementRate: avg(data.rates),
      postCount: data.count,
    };
  });
}

// ---------------------------------------------------------------------------
// Hashtag Performance
// ---------------------------------------------------------------------------

export function getHashtagPerformance(
  filters?: Partial<PostFilters>,
): HashtagPerformance[] {
  const posts = applyFilters(seedPosts, filters);

  const map = new Map<
    string,
    { count: number; rates: number[]; views: number }
  >();

  for (const p of posts) {
    for (const tag of p.hashtags) {
      const entry = map.get(tag) ?? { count: 0, rates: [], views: 0 };
      entry.count += 1;
      entry.rates.push(p.engagementRate);
      entry.views += p.views;
      map.set(tag, entry);
    }
  }

  return Array.from(map.entries())
    .map(([hashtag, data]) => ({
      hashtag,
      postCount: data.count,
      avgEngagementRate: avg(data.rates),
      totalViews: data.views,
    }))
    .sort((a, b) => b.postCount - a.postCount);
}
