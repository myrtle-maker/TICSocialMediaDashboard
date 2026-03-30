import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await prisma.post.findMany();

    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    const dayMap = new Map<string, { posts: number; engagement: number; views: number; rates: number[] }>();

    for (const p of posts) {
      const key = new Date(p.publishedAt).toISOString().slice(0, 10);
      const entry = dayMap.get(key) ?? { posts: 0, engagement: 0, views: 0, rates: [] };
      entry.posts += 1;
      entry.engagement += p.likes + p.comments + p.shares + p.saves;
      entry.views += p.views;
      entry.rates.push(p.engagementRate);
      dayMap.set(key, entry);
    }

    const trends = Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        posts: data.posts,
        engagement: data.engagement,
        views: data.views,
        engagementRate: avg(data.rates),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ trends });
  } catch (err) {
    console.error("Failed to compute trends:", err);
    return NextResponse.json({ trends: [] });
  }
}
