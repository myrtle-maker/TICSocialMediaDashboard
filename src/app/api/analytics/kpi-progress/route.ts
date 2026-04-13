import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface KpiProgressItem {
  id: string;
  metric: string;
  period: string;
  platform: string | null;
  target: number;
  actual: number;
  progress: number;        // 0–100 clamped, based on actual vs target
  projected: number;       // projected end-of-period value based on current pace
  projectedProgress: number; // 0–100 clamped, based on projected vs target
  paceStatus: "ahead" | "on_pace" | "behind" | "complete";
  daysElapsed: number;
  daysInPeriod: number;
  daysRemaining: number;
  onTrack: boolean;
}

function startOf(period: string): Date {
  const now = new Date();
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "quarterly") {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), qStart, 1);
  }
  // monthly
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysInPeriod(period: string): number {
  const now = new Date();
  if (period === "weekly") return 7;
  if (period === "quarterly") {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qStart, 1);
    const end = new Date(now.getFullYear(), qStart + 3, 1);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
  }
  // monthly
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export async function GET() {
  try {
    const targets = await prisma.kpiTarget.findMany();
    if (targets.length === 0) {
      return NextResponse.json({ progress: [] });
    }

    const progress: KpiProgressItem[] = [];
    const now = new Date();

    for (const t of targets) {
      const since = startOf(t.period);
      const totalDays = daysInPeriod(t.period);
      const elapsed = Math.max(1, Math.round((now.getTime() - since.getTime()) / 86_400_000));
      const remaining = Math.max(0, totalDays - elapsed);
      const paceFraction = Math.min(elapsed / totalDays, 1);

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
        });

        if (t.metric === "engagementRate") {
          actual = (agg._avg as { engagementRate: number | null }).engagementRate ?? 0;
        } else {
          actual = ((agg._sum as Record<string, number | null>)?.[t.metric] ?? 0);
        }
      }

      // Trajectory: averages (engagementRate) don't accumulate — current IS projected.
      // Cumulative metrics project forward based on pace.
      const isAverage = t.metric === "engagementRate";
      const projected = isAverage
        ? actual
        : paceFraction > 0
          ? actual / paceFraction
          : 0;

      const progress100 = t.target > 0 ? Math.min((actual / t.target) * 100, 100) : 0;
      const projectedProgress = t.target > 0 ? Math.min((projected / t.target) * 100, 100) : 0;

      // Pace status thresholds: >110% projected = ahead, >90% = on_pace, else behind
      let paceStatus: KpiProgressItem["paceStatus"] = "behind";
      if (progress100 >= 100) {
        paceStatus = "complete";
      } else if (projectedProgress >= 110) {
        paceStatus = "ahead";
      } else if (projectedProgress >= 90) {
        paceStatus = "on_pace";
      }

      progress.push({
        id: t.id,
        metric: t.metric,
        period: t.period,
        platform: t.platform,
        target: t.target,
        actual,
        progress: Math.round(progress100),
        projected: Math.round(projected * (isAverage ? 10000 : 1)) / (isAverage ? 10000 : 1),
        projectedProgress: Math.round(projectedProgress),
        paceStatus,
        daysElapsed: elapsed,
        daysInPeriod: totalDays,
        daysRemaining: remaining,
        onTrack: paceStatus === "ahead" || paceStatus === "on_pace" || paceStatus === "complete",
      });
    }

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("[kpi-progress] Error:", err);
    return NextResponse.json({ error: "Failed to compute KPI progress" }, { status: 500 });
  }
}
