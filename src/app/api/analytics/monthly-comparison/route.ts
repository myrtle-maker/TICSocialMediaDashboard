import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface MonthlyComparisonData {
  current: MonthStats;
  previous: MonthStats;
  changes: ChangeStats;
  topPostThisMonth: PostSummary | null;
  platformBreakdown: PlatformMonth[];
}

interface MonthStats {
  label: string;
  posts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
}

interface ChangeStats {
  posts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
}

interface PostSummary {
  id: string;
  caption: string;
  platform: string;
  engagementRate: number;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  thumbnailUrl: string | null;
}

interface PlatformMonth {
  platform: string;
  current: { posts: number; avgEngagementRate: number; totalViews: number };
  previous: { posts: number; avgEngagementRate: number; totalViews: number };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export async function GET() {
  try {
    const now = new Date();

    // Current month: 1st of this month → now
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = now;

    // Previous month: 1st → last day of last month
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [currentPosts, previousPosts] = await Promise.all([
      prisma.post.findMany({
        where: { publishedAt: { gte: currentStart, lte: currentEnd } },
        select: {
          id: true,
          platform: true,
          caption: true,
          engagementRate: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
          saves: true,
          publishedAt: true,
          thumbnailUrl: true,
        },
      }),
      prisma.post.findMany({
        where: { publishedAt: { gte: previousStart, lte: previousEnd } },
        select: {
          platform: true,
          engagementRate: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
          saves: true,
        },
      }),
    ]);

    function computeStats(posts: typeof currentPosts | typeof previousPosts, label: string): MonthStats {
      const n = posts.length;
      const totalEngagement = posts.reduce((s, p) => s + p.likes + p.comments + p.shares + p.saves, 0);
      const avgER = n > 0 ? posts.reduce((s, p) => s + p.engagementRate, 0) / n : 0;
      return {
        label,
        posts: n,
        totalEngagement,
        avgEngagementRate: avgER,
        totalViews: posts.reduce((s, p) => s + p.views, 0),
        totalLikes: posts.reduce((s, p) => s + p.likes, 0),
        totalComments: posts.reduce((s, p) => s + p.comments, 0),
        totalShares: posts.reduce((s, p) => s + p.shares, 0),
        totalSaves: posts.reduce((s, p) => s + p.saves, 0),
      };
    }

    const current = computeStats(currentPosts, monthLabel(now));
    const previous = computeStats(previousPosts, monthLabel(previousStart));

    const changes: ChangeStats = {
      posts: pctChange(current.posts, previous.posts),
      totalEngagement: pctChange(current.totalEngagement, previous.totalEngagement),
      avgEngagementRate: pctChange(current.avgEngagementRate, previous.avgEngagementRate),
      totalViews: pctChange(current.totalViews, previous.totalViews),
      totalLikes: pctChange(current.totalLikes, previous.totalLikes),
      totalComments: pctChange(current.totalComments, previous.totalComments),
      totalShares: pctChange(current.totalShares, previous.totalShares),
      totalSaves: pctChange(current.totalSaves, previous.totalSaves),
    };

    // Top post this month
    const topPost = currentPosts.length > 0
      ? [...currentPosts].sort((a, b) => b.engagementRate - a.engagementRate)[0]
      : null;

    const topPostThisMonth: PostSummary | null = topPost
      ? {
          id: topPost.id,
          caption: topPost.caption,
          platform: topPost.platform,
          engagementRate: topPost.engagementRate,
          views: topPost.views,
          likes: topPost.likes,
          comments: topPost.comments,
          publishedAt: topPost.publishedAt.toISOString(),
          thumbnailUrl: topPost.thumbnailUrl,
        }
      : null;

    // Platform breakdown
    const platforms = [...new Set([...currentPosts, ...previousPosts].map((p) => p.platform))];
    const platformBreakdown: PlatformMonth[] = platforms.map((platform) => {
      const curr = currentPosts.filter((p) => p.platform === platform);
      const prev = previousPosts.filter((p) => p.platform === platform);
      const avgER = (arr: { engagementRate: number; views: number }[]) =>
        arr.length > 0 ? arr.reduce((s, p) => s + p.engagementRate, 0) / arr.length : 0;
      return {
        platform,
        current: { posts: curr.length, avgEngagementRate: avgER(curr), totalViews: curr.reduce((s, p) => s + p.views, 0) },
        previous: { posts: prev.length, avgEngagementRate: avgER(prev), totalViews: prev.reduce((s, p) => s + p.views, 0) },
      };
    });

    const data: MonthlyComparisonData = {
      current,
      previous,
      changes,
      topPostThisMonth,
      platformBreakdown,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[monthly-comparison] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compute monthly comparison" },
      { status: 500 }
    );
  }
}
