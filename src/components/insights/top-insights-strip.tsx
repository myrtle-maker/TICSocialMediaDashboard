"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight, InsightType } from "@/types/insights";

interface TopInsightsStripProps {
  insights: Insight[];
}

const borderColorMap: Record<InsightType, string> = {
  positive: "border-l-emerald-500",
  negative: "border-l-red-500",
  action: "border-l-blue-500",
  neutral: "border-l-zinc-400 dark:border-l-zinc-500",
};

const metricColorMap: Record<InsightType, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  action: "text-blue-600 dark:text-blue-400",
  neutral: "text-zinc-600 dark:text-zinc-400",
};

export function TopInsightsStrip({ insights }: TopInsightsStripProps) {
  const limited = insights.slice(0, 5);

  if (limited.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
        No insights available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {limited.map((insight) => (
        <Card
          key={insight.id}
          className={cn(
            "border-l-4 overflow-hidden",
            borderColorMap[insight.type]
          )}
        >
          <div className="px-4 py-3">
            {/* Title + metric on one line */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {insight.title}
              </p>
              {insight.metric && (
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold",
                    metricColorMap[insight.type]
                  )}
                >
                  {insight.metric}
                </span>
              )}
            </div>

            {/* Recommendation as second line */}
            {insight.recommendation && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {insight.recommendation}
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
