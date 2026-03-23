import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany();

    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    const cells = new Map<string, { rates: number[]; count: number }>();

    for (const p of posts) {
      const dt = new Date(p.publishedAt);
      const day = dt.getUTCDay();
      const hour = dt.getUTCHours();
      const key = `${day}-${hour}`;
      const entry = cells.get(key) ?? { rates: [], count: 0 };
      entry.rates.push(p.engagementRate);
      entry.count += 1;
      cells.set(key, entry);
    }

    const heatmap = Array.from(cells.entries()).map(([key, data]) => {
      const [dayStr, hourStr] = key.split("-");
      return {
        day: Number(dayStr),
        hour: Number(hourStr),
        avgEngagementRate: avg(data.rates),
        postCount: data.count,
      };
    });

    return NextResponse.json({ heatmap });
  } catch (err) {
    console.error("Failed to compute demographics:", err);
    return NextResponse.json({ heatmap: [] });
  }
}
