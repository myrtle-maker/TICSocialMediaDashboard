"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/types/insights";

interface InsightsSummaryProps {
  insights: Insight[];
  postCount: number;
}

export function InsightsSummary({ insights, postCount }: InsightsSummaryProps) {
  const highPriority = insights.filter((i) => i.priority === "high").length;
  const actionItems = insights.filter((i) => i.type === "action").length;

  const stats = [
    { label: "Total Insights", value: insights.length, color: "text-zinc-900 dark:text-zinc-100" },
    { label: "High Priority", value: highPriority, color: "text-red-600 dark:text-red-400" },
    { label: "Action Items", value: actionItems, color: "text-blue-600 dark:text-blue-400" },
    { label: "Posts Analyzed", value: postCount, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center">
            <p className={cn("text-2xl font-bold", stat.color)}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
