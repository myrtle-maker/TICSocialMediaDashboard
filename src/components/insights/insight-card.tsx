"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insight, InsightType, InsightPriority } from "@/types/insights";

interface InsightCardProps {
  insight: Insight;
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
  neutral: "text-zinc-700 dark:text-zinc-300",
};

const priorityVariantMap: Record<InsightPriority, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 overflow-hidden",
        borderColorMap[insight.type]
      )}
    >
      <div className="p-5 space-y-3">
        {/* Priority + Category badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={priorityVariantMap[insight.priority]}>
            {insight.priority}
          </Badge>
          <Badge variant="secondary">{insight.category}</Badge>
        </div>

        {/* Title */}
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
          {insight.title}
        </h3>

        {/* Metric */}
        {insight.metric && (
          <p
            className={cn(
              "text-2xl font-bold",
              metricColorMap[insight.type]
            )}
          >
            {insight.metric}
          </p>
        )}

        {/* Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {insight.description}
        </p>

        {/* Recommendation callout */}
        {insight.recommendation && (
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-3">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              {insight.recommendation}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
