import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await prisma.post.findMany();

    const totalEngagement = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares + p.saves, 0
    );

    const platformMap = new Map<string, { posts: number; engagement: number; views: number }>();
    for (const p of posts) {
      const entry = platformMap.get(p.platform) ?? { posts: 0, engagement: 0, views: 0 };
      entry.posts += 1;
      entry.engagement += p.likes + p.comments + p.shares + p.saves;
      entry.views += p.views;
      platformMap.set(p.platform, entry);
    }

    const platformBreakdown = Array.from(platformMap.entries()).map(
      ([platform, data]) => ({ platform, ...data })
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
