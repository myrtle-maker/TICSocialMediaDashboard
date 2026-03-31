import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface KpiProgressItem {
  id: string;
  metric: string;
  period: string;
  platform: string | null;
  target: number;
  actual: number;
  progress: number; // 0–100 clamped percentage
  onTrack: boolean;
}

function startOf(period: string): Date {
  const now = new Date();
  if (period === "weekly") {
    const day = now.getDay(); // 0=Sun
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // monthly
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET() {
  try {
    const targets = await prisma.kpiTarget.findMany();
    if (targets.length === 0) {
      return NextResponse.json({ progress: [] });
    }

    const progress: KpiProgressItem[] = [];

    for (const t of targets) {
      const since = startOf(t.period);
      const platformFilter = t.platform ? { platform: t.platform } : {};

      let actual = 0;

      if (t.metric === "posts") {
        actual = await prisma.post.count({
          where: { publishedAt: { gte: since }, ...platformFilter },
        });
      } else {
        const agg = await prisma.post.aggregate({
          where: { publishedAt: { gte: since }, ...platformFilter },
          _avg: t.metric === "engagementRate" ? { engagementRate: true } : undefined,
          _sum: ["views", "likes", "comments", "shares", "saves"].includes(t.metric)
            ? ({ [t.metric]: true } as Record<string, true>)
            : undefined,
          _count: undefined,
        });

        if (t.metric === "engagementRate") {
          actual = (agg._avg as { engagementRate: number | null }).engagementRate ?? 0;
        } else {
          actual = ((agg._sum as Record<string, number | null>)?.[t.metric] ?? 0);
        }
      }

      const pct = t.target > 0 ? Math.min((actual / t.target) * 100, 100) : 0;

      progress.push({
        id: t.id,
        metric: t.metric,
        period: t.period,
        platform: t.platform,
        target: t.target,
        actual,
        progress: Math.round(pct),
        onTrack: pct >= 80,
      });
    }

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("[kpi-progress] Error:", err);
    return NextResponse.json({ error: "Failed to compute KPI progress" }, { status: 500 });
  }
}
