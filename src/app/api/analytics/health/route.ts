import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { avg, pctDiff, groupBy } from "@/lib/analytics/insights-helpers";

/** Ideal posts per week per platform (used for consistency scoring). */
const IDEAL_POSTS_PER_WEEK: Record<string, number> = {
  tiktok: 5,
  instagram: 4,
  youtube: 2,
  twitter: 7,
  facebook: 3,
  linkedin: 3,
};
const DEFAULT_IDEAL = 3;

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      select: {
        platform: true,
        engagementRate: true,
        publishedAt: true,
        likes: true,
        comments: true,
        shares: true,
        saves: true,
        views: true,
      },
    });

    if (posts.length === 0) {
      return NextResponse.json({ scores: [] });
    }

    const byPlatform = groupBy(posts, (p) => p.platform);
    const overallAvgER = avg(posts.map((p) => p.engagementRate));

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86_400_000);

    const scores: Array<{
      platform: string;
      score: number | null;
      trend: "up" | "down" | "stable";
      postCount: number;
      avgER: number;
      status?: string;
    }> = [];

    for (const [platform, platformPosts] of byPlatform) {
      const postCount = platformPosts.length;
      const platformAvgER = avg(platformPosts.map((p) => p.engagementRate));

      if (postCount < 5) {
        scores.push({
          platform,
          score: null,
          trend: "stable",
          postCount,
          avgER: platformAvgER,
          status: "insufficient_data",
        });
        continue;
      }

      // --- Engagement trend (40%) ---
      const recentPosts = platformPosts.filter(
        (p) => new Date(p.publishedAt) >= fourteenDaysAgo
      );
      const priorPosts = platformPosts.filter((p) => {
        const d = new Date(p.publishedAt);
        return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
      });

      const recentER = avg(recentPosts.map((p) => p.engagementRate));
      const priorER = avg(priorPosts.map((p) => p.engagementRate));

      let trendPct = 0;
      if (priorPosts.length > 0 && recentPosts.length > 0) {
        trendPct = pctDiff(recentER, priorER);
      }
      // Clamp trend contribution: -50% to +50% maps to 0-100
      const trendScore = Math.max(0, Math.min(100, 50 + trendPct));

      // --- Posting consistency (30%) ---
      const oldestPost = platformPosts.reduce((a, b) =>
        new Date(a.publishedAt) < new Date(b.publishedAt) ? a : b
      );
      const spanMs = now.getTime() - new Date(oldestPost.publishedAt).getTime();
      const spanWeeks = Math.max(1, spanMs / (7 * 86_400_000));
      const postsPerWeek = postCount / spanWeeks;
      const idealFreq = IDEAL_POSTS_PER_WEEK[platform] ?? DEFAULT_IDEAL;
      // Ratio of actual vs ideal, capped at 1.0 (hitting ideal = 100)
      const consistencyRatio = Math.min(postsPerWeek / idealFreq, 1);
      // Penalise over-posting slightly less than under-posting
      const overPostPenalty =
        postsPerWeek > idealFreq * 1.5
          ? Math.max(0, 1 - (postsPerWeek - idealFreq * 1.5) / (idealFreq * 2))
          : 1;
      const consistencyScore = consistencyRatio * overPostPenalty * 100;

      // --- Engagement rate vs overall average (30%) ---
      let erScore = 50; // default middle
      if (overallAvgER > 0) {
        const ratio = platformAvgER / overallAvgER;
        // ratio of 1 = 50, ratio of 2 = 100, ratio of 0 = 0
        erScore = Math.max(0, Math.min(100, ratio * 50));
      }

      // --- Weighted composite ---
      const composite = Math.round(
        trendScore * 0.4 + consistencyScore * 0.3 + erScore * 0.3
      );
      const score = Math.max(0, Math.min(100, composite));

      // Determine trend direction
      let trend: "up" | "down" | "stable" = "stable";
      if (trendPct > 5) trend = "up";
      else if (trendPct < -5) trend = "down";

      scores.push({
        platform,
        score,
        trend,
        postCount,
        avgER: platformAvgER,
      });
    }

    // Sort by score descending (nulls last)
    scores.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("Failed to compute health scores:", err);
    return NextResponse.json({ scores: [] });
  }
}
