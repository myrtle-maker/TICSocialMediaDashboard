import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await prisma.post.findMany();

    const groups = new Map<string, typeof posts>();
    for (const p of posts) {
      const arr = groups.get(p.hookType) ?? [];
      arr.push(p);
      groups.set(p.hookType, arr);
    }

    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    const analysis = Array.from(groups.entries())
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

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Failed to compute hook analysis:", err);
    return NextResponse.json({ analysis: [] });
  }
}
