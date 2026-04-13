import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const METRICS = ["engagementRate", "views", "likes", "comments", "shares", "saves", "posts"] as const;
type Metric = typeof METRICS[number];

export interface TargetSuggestion {
  metric: Metric;
  period: "weekly" | "monthly" | "quarterly";
  currentAvg: number;           // average value over the last 3 complete periods
  achievable: number;           // avg × 1.10
  stretch: number;              // avg × 1.25
  basedOnPeriods: number;       // how many complete periods were analysed
  lastPeriodValue: number;      // value in the most recent complete period
}

// Returns start/end of the Nth complete period prior to now (1 = most recent complete)
function completePeriodRange(period: "weekly" | "monthly" | "quarterly", n: number): { from: Date; to: Date } {
  const now = new Date();

  if (period === "weekly") {
    // Current week starts last Sunday; step back n weeks
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - now.getDay());
    currentStart.setHours(0, 0, 0, 0);
    const from = new Date(currentStart);
    from.setDate(from.getDate() - n * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from, to };
  }

  if (period === "quarterly") {
    const currentQStart = Math.floor(now.getMonth() / 3) * 3;
    // Go back n quarters
    let year = now.getFullYear();
    let qStart = currentQStart - n * 3;
    while (qStart < 0) { qStart += 12; year--; }
    const from = new Date(year, qStart, 1);
    const to = new Date(year, qStart + 3, 1);
    return { from, to };
  }

  // monthly: step back n months from the 1st of current month
  const from = new Date(now.getFullYear(), now.getMonth() - n, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
  return { from, to };
}

async function getMetricValue(metric: Metric, from: Date, to: Date, platform?: string | null): Promise<number> {
  const where = {
    publishedAt: { gte: from, lt: to },
    ...(platform ? { platform } : {}),
  };

  if (metric === "posts") {
    return prisma.post.count({ where });
  }
  if (metric === "engagementRate") {
    const agg = await prisma.post.aggregate({ where, _avg: { engagementRate: true } });
    return agg._avg.engagementRate ?? 0;
  }
  const agg = await prisma.post.aggregate({
    where,
    _sum: { [metric]: true } as Record<string, true>,
  });
  return (agg._sum as Record<string, number | null>)[metric] ?? 0;
}

function round(value: number, metric: Metric): number {
  if (metric === "engagementRate") return Math.round(value * 100000) / 100000;
  return Math.round(value);
}

export async function GET() {
  try {
    const suggestions: TargetSuggestion[] = [];
    const periods: Array<"weekly" | "monthly" | "quarterly"> = ["weekly", "monthly", "quarterly"];
    const LOOK_BACK = 3; // analyse last 3 complete periods

    for (const period of periods) {
      for (const metric of METRICS) {
        const values: number[] = [];

        for (let n = 1; n <= LOOK_BACK; n++) {
          const { from, to } = completePeriodRange(period, n);
          const val = await getMetricValue(metric, from, to);
          if (val > 0) values.push(val);
        }

        if (values.length === 0) continue;

        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const lastPeriodValue = values[0]; // most recent complete period

        suggestions.push({
          metric,
          period,
          currentAvg: round(avg, metric),
          achievable: round(avg * 1.1, metric),
          stretch: round(avg * 1.25, metric),
          basedOnPeriods: values.length,
          lastPeriodValue: round(lastPeriodValue, metric),
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[target-suggestions] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
