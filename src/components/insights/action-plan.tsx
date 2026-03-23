"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/types/insights";

interface ActionPlanProps {
  insights: Insight[];
}

export function ActionPlan({ insights }: ActionPlanProps) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
        No action items found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <Card
          key={insight.id}
          className="border border-zinc-200 dark:border-zinc-700"
        >
          <div className="flex gap-4 p-5">
            {/* Numbered circle */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                "text-sm font-bold"
              )}
            >
              {index + 1}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {/* Title */}
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                {insight.title}
              </h4>

              {/* Metric */}
              {insight.metric && (
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {insight.metric}
                </p>
              )}

              {/* Recommendation */}
              {insight.recommendation && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-4 py-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {insight.recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
