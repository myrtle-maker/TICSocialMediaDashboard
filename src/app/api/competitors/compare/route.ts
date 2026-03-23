import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MetricsSummary {
  id: string;
  name: string;
  platform: string;
  postCount: number;
  avgEngagementRate: number;
  bestHookType: string | null;
  bestContentType: string | null;
}

interface WeeklyDataPoint {
  week: string;
  label: string;
  avgEngagementRate: number;
}

export async function GET() {
  try {
    // 1. Your accounts metrics
    const yourPosts = await prisma.post.findMany({
      select: {
        engagementRate: true,
        hookType: true,
        contentType: true,
        publishedAt: true,
        platform: true,
      },
    });

    const yourMetrics: MetricsSummary = {
      id: "you",
      name: "Your Accounts",
      platform: "all",
      postCount: yourPosts.length,
      avgEngagementRate:
        yourPosts.length > 0
          ? yourPosts.reduce((s, p) => s + p.engagementRate, 0) / yourPosts.length
          : 0,
      bestHookType: getBestByAvgER(yourPosts, "hookType"),
      bestContentType: getBestByAvgER(yourPosts, "contentType"),
    };

    // 2. Competitor metrics
    const competitors = await prisma.competitor.findMany({
      include: {
        posts: {
          select: {
            engagementRate: true,
            hookType: true,
            contentType: true,
            publishedAt: true,
            platform: true,
          },
        },
      },
    });

    const competitorMetrics: MetricsSummary[] = competitors.map((c) => ({
      id: c.id,
      name: c.displayName,
      platform: c.platform,
      postCount: c.posts.length,
      avgEngagementRate:
        c.posts.length > 0
          ? c.posts.reduce((s, p) => s + p.engagementRate, 0) / c.posts.length
          : 0,
      bestHookType: getBestByAvgER(c.posts, "hookType"),
      bestContentType: getBestByAvgER(c.posts, "contentType"),
    }));

    // 3. Weekly time series (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const yourWeekly = getWeeklyER(
      yourPosts.filter((p) => new Date(p.publishedAt) >= eightWeeksAgo)
    );

    const competitorWeekly: Record<string, WeeklyDataPoint[]> = {};
    for (const c of competitors) {
      competitorWeekly[c.id] = getWeeklyER(
        c.posts.filter((p) => new Date(p.publishedAt) >= eightWeeksAgo)
      );
    }

    return NextResponse.json({
      you: yourMetrics,
      competitors: competitorMetrics,
      timeSeries: {
        you: yourWeekly,
        competitors: competitorWeekly,
      },
    });
  } catch (err) {
    console.error("Competitor compare error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Comparison failed" }, { status: 500 });
  }
}

function getBestByAvgER(
  posts: { engagementRate: number; hookType: string; contentType: string }[],
  field: "hookType" | "contentType"
): string | null {
  if (posts.length === 0) return null;

  const map = new Map<string, { total: number; count: number }>();
  for (const p of posts) {
    const key = p[field];
    const existing = map.get(key) ?? { total: 0, count: 0 };
    existing.total += p.engagementRate;
    existing.count += 1;
    map.set(key, existing);
  }

  let best: string | null = null;
  let bestAvg = -1;
  for (const [key, val] of map.entries()) {
    const avg = val.total / val.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = key;
    }
  }
  return best;
}

function getWeeklyER(
  posts: { engagementRate: number; publishedAt: Date }[]
): WeeklyDataPoint[] {
  const weeks = new Map<string, { total: number; count: number }>();

  for (const p of posts) {
    const d = new Date(p.publishedAt);
    // Get ISO week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    const key = weekStart.toISOString().split("T")[0];

    const existing = weeks.get(key) ?? { total: 0, count: 0 };
    existing.total += p.engagementRate;
    existing.count += 1;
    weeks.set(key, existing);
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, val]) => ({
      week,
      label: `W/O ${week}`,
      avgEngagementRate: val.count > 0 ? val.total / val.count : 0,
    }));
}
