"use client";

import type { KpiProgressItem } from "@/app/api/analytics/kpi-progress/route";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types/social";
import { X, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";

export const METRIC_LABELS: Record<string, string> = {
  engagementRate: "Avg Engagement Rate",
  views: "Total Views",
  likes: "Total Likes",
  comments: "Total Comments",
  shares: "Total Shares",
  saves: "Total Saves",
  posts: "Posts Published",
};

export function formatValue(metric: string, value: number): string {
  if (metric === "engagementRate") return formatPercentage(value);
  return formatNumber(value);
}

interface KpiTargetCardProps {
  item: KpiProgressItem;
  onDelete?: (id: string) => void;
}

export function KpiTargetCard({ item, onDelete }: KpiTargetCardProps) {
  const label = METRIC_LABELS[item.metric] ?? item.metric;
  const platformLabel = item.platform
    ? PLATFORM_CONFIG[item.platform as Platform]?.label ?? item.platform
    : "All Platforms";

  const isComplete = item.paceStatus === "complete";
  const isAverage = item.metric === "engagementRate";

  const barColor = isComplete
    ? "bg-emerald-500"
    : item.paceStatus === "ahead"
      ? "bg-emerald-400"
      : item.paceStatus === "on_pace"
        ? "bg-blue-500"
        : "bg-red-400";

  const PaceIcon = isComplete
    ? CheckCircle2
    : item.paceStatus === "ahead"
      ? TrendingUp
      : item.paceStatus === "on_pace"
        ? Minus
        : TrendingDown;

  const paceColor = isComplete
    ? "text-emerald-600 dark:text-emerald-400"
    : item.paceStatus === "ahead"
      ? "text-emerald-600 dark:text-emerald-400"
      : item.paceStatus === "on_pace"
        ? "text-blue-600 dark:text-blue-400"
        : "text-red-500 dark:text-red-400";

  const paceLabel = isComplete
    ? "Target reached"
    : item.paceStatus === "ahead"
      ? "Ahead of pace"
      : item.paceStatus === "on_pace"
        ? "On pace"
        : "Behind pace";

  // Show projected value for cumulative metrics only
  const showProjected = !isAverage && !isComplete && item.daysElapsed > 1;

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">
            {platformLabel} · {item.period}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 rounded p-0.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
            title="Remove target"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Current / Target */}
      <div className="mb-1.5 flex items-end justify-between">
        <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatValue(item.metric, item.actual)}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          / {formatValue(item.metric, item.target)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${item.progress}%` }}
        />
      </div>

      {/* Pace status + days remaining */}
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-0.5 text-xs font-medium ${paceColor}`}>
          <PaceIcon className="h-3 w-3" />
          {paceLabel}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {item.progress}%
        </span>
      </div>

      {/* Projected value or days remaining */}
      {showProjected && (
        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          On pace for {formatValue(item.metric, item.projected)} · {item.daysRemaining}d left
        </p>
      )}
      {!showProjected && !isComplete && item.daysRemaining > 0 && (
        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {item.daysRemaining} day{item.daysRemaining !== 1 ? "s" : ""} remaining
        </p>
      )}
    </div>
  );
}
