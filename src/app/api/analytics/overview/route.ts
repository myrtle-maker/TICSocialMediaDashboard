import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const where: Prisma.PostWhereInput = {};

    const platforms = searchParams.get("platforms");
    if (platforms) where.platform = { in: platforms.split(",") };

    const contentTypes = searchParams.get("contentTypes");
    if (contentTypes) where.contentType = { in: contentTypes.split(",") };

    const hookTypes = searchParams.get("hookTypes");
    if (hookTypes) where.hookType = { in: hookTypes.split(",") };

    const from = searchParams.get("dateFrom") ?? searchParams.get("from");
    const to = searchParams.get("dateTo") ?? searchParams.get("to");
    if (from && to) {
      where.publishedAt = { gte: new Date(from), lte: new Date(to) };
    }

    const minEngagementRate = searchParams.get("minEngagementRate");
    if (minEngagementRate) {
      where.engagementRate = { gte: parseFloat(minEngagementRate) };
    }

    const minViews = searchParams.get("minViews");
    if (minViews) {
      where.views = { gte: parseInt(minViews) };
    }

    const searchQuery = searchParams.get("searchQuery") ?? searchParams.get("q");
    if (searchQuery) {
      where.OR = [
        { caption: { contains: searchQuery, mode: "insensitive" } },
        { hookText: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const posts = await prisma.post.findMany({ where });

    const totalEngagement = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares + p.saves,
      0
    );

    const platformMap = new Map<string, { posts: number; engagement: number; views: number; rates: number[] }>();
    for (const p of posts) {
      const entry = platformMap.get(p.platform) ?? { posts: 0, engagement: 0, views: 0, rates: [] };
      entry.posts += 1;
      entry.engagement += p.likes + p.comments + p.shares + p.saves;
      entry.views += p.views;
      entry.rates.push(p.engagementRate);
      platformMap.set(p.platform, entry);
    }

    const platformBreakdown = Array.from(platformMap.entries()).map(
      ([platform, data]) => ({
        platform,
        posts: data.posts,
        engagement: data.engagement,
        views: data.views,
        avgEngagementRate: data.rates.length > 0
          ? data.rates.reduce((a, b) => a + b, 0) / data.rates.length
          : 0,
      })
    );

    const topPost = posts.length > 0
      ? posts.reduce((best, p) => (p.engagementRate > best.engagementRate ? p : best))
      : null;

    const avgRate = posts.length > 0
      ? posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length
      : 0;

    return NextResponse.json({
      totalPosts: posts.length,
      totalEngagement,
      avgEngagementRate: avgRate,
      totalViews: posts.reduce((s, p) => s + p.views, 0),
      totalLikes: posts.reduce((s, p) => s + p.likes, 0),
      totalShares: posts.reduce((s, p) => s + p.shares, 0),
      totalSaves: posts.reduce((s, p) => s + p.saves, 0),
      totalComments: posts.reduce((s, p) => s + p.comments, 0),
      platformBreakdown,
      topPost,
    });
  } catch (err) {
    console.error("Failed to compute KPIs:", err);
    return NextResponse.json({
      totalPosts: 0, totalEngagement: 0, avgEngagementRate: 0,
      totalViews: 0, totalLikes: 0, totalShares: 0, totalSaves: 0,
      totalComments: 0, platformBreakdown: [], topPost: null,
    });
  }
}
