"use client";

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

type VelocityPattern = "viral" | "steady" | "slow_burn";

interface EngagementVelocityProps {
  postId: string;
  likes: number;
  views: number;
  publishedAt: string | Date;
}

function getPattern(engagementRate: number): VelocityPattern {
  if (engagementRate >= 8) return "viral";
  if (engagementRate >= 3) return "steady";
  return "slow_burn";
}

function getPatternLabel(pattern: VelocityPattern): string {
  switch (pattern) {
    case "viral":
      return "Viral spike";
    case "steady":
      return "Steady growth";
    case "slow_burn":
      return "Slow burn";
  }
}

function generateCurveData(
  pattern: VelocityPattern,
  totalEngagement: number,
  ageHours: number
): { t: number; v: number }[] {
  const points = 20;
  const data: { t: number; v: number }[] = [];
  const maxT = Math.max(ageHours, 1);

  for (let i = 0; i <= points; i++) {
    const fraction = i / points;
    const t = fraction * maxT;
    let v: number;

    switch (pattern) {
      case "viral": {
        // Exponential rise peaking around 20% of lifespan, then plateau
        const peakFraction = 0.2;
        if (fraction <= peakFraction) {
          // Exponential growth phase
          const normalized = fraction / peakFraction;
          v = totalEngagement * (1 - Math.exp(-4 * normalized));
        } else {
          // Plateau with very slight growth
          const plateauStart =
            totalEngagement * (1 - Math.exp(-4));
          const remaining = totalEngagement - plateauStart;
          const plateauFraction =
            (fraction - peakFraction) / (1 - peakFraction);
          v =
            plateauStart +
            remaining * (1 - Math.exp(-2 * plateauFraction));
        }
        break;
      }
      case "steady": {
        // S-curve growth
        const k = 6;
        const midpoint = 0.4;
        v =
          totalEngagement /
          (1 + Math.exp(-k * (fraction - midpoint)));
        break;
      }
      case "slow_burn": {
        // Logarithmic growth
        v =
          totalEngagement *
          (Math.log(1 + fraction * 9) / Math.log(10));
        break;
      }
    }

    data.push({ t: Math.round(t), v: Math.round(Math.max(0, v)) });
  }

  return data;
}

export function EngagementVelocity({
  postId,
  likes,
  views,
  publishedAt,
}: EngagementVelocityProps) {
  const { data, pattern, label } = useMemo(() => {
    const published =
      typeof publishedAt === "string"
        ? new Date(publishedAt)
        : publishedAt;
    const now = new Date();
    const ageHours = Math.max(
      1,
      (now.getTime() - published.getTime()) / 3_600_000
    );

    const engagementRate = views > 0 ? (likes / views) * 100 : 0;
    const pat = getPattern(engagementRate);
    const totalEngagement = likes + Math.round(views * 0.01);

    return {
      data: generateCurveData(pat, totalEngagement, ageHours),
      pattern: pat,
      label: getPatternLabel(pat),
    };
  }, [postId, likes, views, publishedAt]);

  const gradientId = `velocity-gradient-${postId}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-[100px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#3b82f6"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="#3b82f6"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#3b82f6"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}
