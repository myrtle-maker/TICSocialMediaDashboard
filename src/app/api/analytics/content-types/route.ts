import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await prisma.post.findMany();

    const groups = new Map<string, typeof posts>();
    for (const p of posts) {
      const arr = groups.get(p.contentType) ?? [];
      arr.push(p);
      groups.set(p.contentType, arr);
    }

    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const analysis = Array.from(groups.entries())
      .map(([contentType, groupPosts]) => ({
        contentType,
        postCount: groupPosts.length,
        avgEngagementRate: avg(groupPosts.map((p) => p.engagementRate)),
        avgViews: avg(groupPosts.map((p) => p.views)),
        totalEngagement: sum(groupPosts.map((p) => p.likes + p.comments + p.shares + p.saves)),
      }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Failed to compute content analysis:", err);
    return NextResponse.json({ analysis: [] });
  }
}
